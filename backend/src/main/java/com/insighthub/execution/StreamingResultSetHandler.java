package com.insighthub.execution;

import com.insighthub.guardrails.GuardrailsConfigEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.*;
import java.util.*;

/**
 * Cursor-based streaming result set handler that executes SQL queries
 * with memory-bounded row extraction.
 *
 * <p>Enforces guardrails:</p>
 * <ul>
 *   <li>fetchSize — controls JDBC cursor batch size to limit heap usage</li>
 *   <li>queryTimeout — Statement.setQueryTimeout() for timeout enforcement</li>
 *   <li>maxRows — stop fetching when row limit is reached</li>
 *   <li>maxResultSizeBytes — track estimated byte size and stop if exceeded</li>
 * </ul>
 *
 * <p>Properties guaranteed:</p>
 * <ul>
 *   <li>Property 2: Memory Bounded — rows in heap bounded by max(pageSize, fetchSize)</li>
 *   <li>Property 3: Timeout Guarantee — Statement.cancel() on timeout</li>
 * </ul>
 *
 * <p>JDBC resources (ResultSet, Statement, Connection) are always released in finally blocks.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StreamingResultSetHandler {

    /**
     * Result of a streaming query execution containing the extracted page of rows,
     * column metadata, truncation info, and total rows encountered.
     */
    public record StreamingResult(
            List<String> columns,
            List<Map<String, Object>> rows,
            long totalRowsScanned,
            boolean truncated,
            String truncationReason,
            long estimatedBytes
    ) {}

    /**
     * Executes the given prepared SQL with parameter bindings against the provided DataSource
     * using cursor-based streaming. Creates a PreparedStatement, binds each parameter value
     * using the appropriate JDBC setter, and extracts a single page of rows.
     *
     * <p>This method is the preferred execution path when {@code usePreparedStatements} is enabled
     * on the report, providing SQL injection protection at the driver level.</p>
     *
     * @param dataSource the JDBC DataSource to execute against
     * @param sql        the SQL query with {@code ?} positional placeholders
     * @param bindings   ordered list of values to bind to the placeholders
     * @param guardrails the effective guardrails config (timeout, maxRows, maxResultSizeBytes)
     * @param page       the 1-based page number to extract
     * @param pageSize   the number of rows per page
     * @return StreamingResult containing the extracted page and metadata
     */
    public StreamingResult execute(DataSource dataSource, String sql,
                                   List<BindValue> bindings,
                                   GuardrailsConfigEntity guardrails,
                                   int page, int pageSize) {
        Connection connection = null;
        PreparedStatement preparedStatement = null;
        ResultSet resultSet = null;

        try {
            connection = dataSource.getConnection();

            // Use forward-only, read-only ResultSet for cursor-based streaming
            preparedStatement = connection.prepareStatement(sql,
                    ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY
            );

            // Bind parameters using appropriate JDBC setters based on declared type
            bindParameters(preparedStatement, bindings);

            // Configure fetch size from guardrails — controls how many rows the
            // JDBC driver fetches from the database per network round-trip.
            int fetchSize = Math.min(pageSize, guardrails.getMaxRows());
            preparedStatement.setFetchSize(fetchSize);

            // Set query timeout from guardrails for timeout enforcement (Property 3)
            preparedStatement.setQueryTimeout(guardrails.getExecutionTimeoutSeconds());

            resultSet = preparedStatement.executeQuery();

            // Delegate to shared row extraction logic
            return extractResults(resultSet, guardrails, page, pageSize, sql);

        } catch (SQLTimeoutException e) {
            log.warn("Query execution timed out after {} seconds for prepared SQL: {}",
                    guardrails.getExecutionTimeoutSeconds(), truncateSql(sql));
            cancelStatementQuietly(preparedStatement);
            throw new QueryTimeoutException(
                    "Query execution timed out after " + guardrails.getExecutionTimeoutSeconds() + " seconds", e);
        } catch (SQLException e) {
            log.error("Prepared statement execution error: {}", e.getMessage());
            cancelStatementQuietly(preparedStatement);
            throw new QueryExecutionException("SQL error: " + e.getMessage(), e);
        } finally {
            closeQuietly(resultSet);
            closeQuietly(preparedStatement);
            closeQuietly(connection);
        }
    }

    /**
     * Executes the given SQL against the provided DataSource using cursor-based streaming.
     * Extracts a single page of rows (defined by page number and page size) without
     * buffering the full result set in memory.
     *
     * <p>This is the fallback execution path for reports that use non-standard syntax
     * (dynamic SQL, XML tags, etc.) or have {@code usePreparedStatements} disabled.</p>
     *
     * @param dataSource the JDBC DataSource to execute against
     * @param sql        the fully-substituted SQL query (with ORDER BY and any wrapping applied)
     * @param guardrails the effective guardrails config (timeout, maxRows, maxResultSizeBytes)
     * @param page       the 1-based page number to extract
     * @param pageSize   the number of rows per page
     * @return StreamingResult containing the extracted page and metadata
     */
    public StreamingResult execute(DataSource dataSource, String sql,
                                   GuardrailsConfigEntity guardrails,
                                   int page, int pageSize) {
        Connection connection = null;
        Statement statement = null;
        ResultSet resultSet = null;

        try {
            connection = dataSource.getConnection();

            // Use forward-only, read-only ResultSet for cursor-based streaming
            statement = connection.createStatement(
                    ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY
            );

            // Configure fetch size from guardrails — controls how many rows the
            // JDBC driver fetches from the database per network round-trip.
            // This bounds the number of rows held in the driver's internal buffer.
            int fetchSize = Math.min(pageSize, guardrails.getMaxRows());
            statement.setFetchSize(fetchSize);

            // Set query timeout from guardrails for timeout enforcement (Property 3)
            statement.setQueryTimeout(guardrails.getExecutionTimeoutSeconds());

            resultSet = statement.executeQuery(sql);

            // Delegate to shared row extraction logic
            return extractResults(resultSet, guardrails, page, pageSize, sql);

        } catch (SQLTimeoutException e) {
            log.warn("Query execution timed out after {} seconds for SQL: {}",
                    guardrails.getExecutionTimeoutSeconds(), truncateSql(sql));
            // Cancel the statement if it's still running (Property 3: Timeout Guarantee)
            cancelStatementQuietly(statement);
            throw new QueryTimeoutException(
                    "Query execution timed out after " + guardrails.getExecutionTimeoutSeconds() + " seconds", e);
        } catch (SQLException e) {
            log.error("SQL execution error: {}", e.getMessage());
            cancelStatementQuietly(statement);
            throw new QueryExecutionException("SQL error: " + e.getMessage(), e);
        } finally {
            // Release JDBC resources in reverse order (Requirement 17.4)
            closeQuietly(resultSet);
            closeQuietly(statement);
            closeQuietly(connection);
        }
    }

    /**
     * Binds parameter values to a PreparedStatement using the appropriate JDBC setter
     * based on the declared JDBC type of each binding.
     *
     * <p>Supported JDBC types:</p>
     * <ul>
     *   <li>{@link Types#VARCHAR} → setString</li>
     *   <li>{@link Types#DOUBLE} → setDouble</li>
     *   <li>{@link Types#DATE} → setDate</li>
     *   <li>{@link Types#TIMESTAMP} → setTimestamp</li>
     *   <li>{@link Types#BOOLEAN} → setBoolean</li>
     * </ul>
     *
     * <p>For null values, {@code setNull(index, jdbcType)} is called regardless of the type.</p>
     *
     * @param stmt     the prepared statement to bind parameters to
     * @param bindings the ordered list of values to bind
     * @throws SQLException if a binding operation fails
     */
    private void bindParameters(PreparedStatement stmt, List<BindValue> bindings) throws SQLException {
        for (int i = 0; i < bindings.size(); i++) {
            int paramIndex = i + 1; // JDBC indices are 1-based
            BindValue binding = bindings.get(i);
            Object value = binding.value();
            int jdbcType = binding.jdbcType();

            if (value == null) {
                stmt.setNull(paramIndex, jdbcType);
                continue;
            }

            switch (jdbcType) {
                case Types.VARCHAR -> stmt.setString(paramIndex, (String) value);
                case Types.DOUBLE -> stmt.setDouble(paramIndex, ((Number) value).doubleValue());
                case Types.DATE -> stmt.setDate(paramIndex, java.sql.Date.valueOf(value.toString()));
                case Types.TIMESTAMP -> stmt.setTimestamp(paramIndex, java.sql.Timestamp.valueOf(value.toString()));
                case Types.BOOLEAN -> stmt.setBoolean(paramIndex, (Boolean) value);
                default -> stmt.setObject(paramIndex, value, jdbcType);
            }
        }
    }

    /**
     * Shared row extraction logic used by both the raw SQL and prepared statement execute paths.
     * Reads the ResultSet, applies guardrails, and returns the requested page of results.
     */
    private StreamingResult extractResults(ResultSet resultSet, GuardrailsConfigEntity guardrails,
                                           int page, int pageSize, String sql) throws SQLException {
        // Extract column names from ResultSet metadata
        ResultSetMetaData metaData = resultSet.getMetaData();
        int columnCount = metaData.getColumnCount();
        List<String> columns = new ArrayList<>(columnCount);
        for (int i = 1; i <= columnCount; i++) {
            columns.add(metaData.getColumnLabel(i));
        }

        // Calculate the offset for cursor skip (page is 1-based)
        int offset = (page - 1) * pageSize;
        int maxRows = guardrails.getMaxRows();
        long maxResultSizeBytes = guardrails.getMaxResultSizeBytes();

        // Skip rows before the requested page (cursor-based skip)
        int rowsSkipped = 0;
        while (rowsSkipped < offset && resultSet.next()) {
            rowsSkipped++;
            if (rowsSkipped > maxRows) {
                return new StreamingResult(
                        columns,
                        Collections.emptyList(),
                        rowsSkipped,
                        true,
                        "max_rows",
                        0L
                );
            }
        }

        // Extract the page of rows
        List<Map<String, Object>> rows = new ArrayList<>(pageSize);
        long estimatedBytes = 0L;
        long totalRowsScanned = rowsSkipped;
        boolean truncated = false;
        String truncationReason = null;

        int rowsExtracted = 0;
        while (rowsExtracted < pageSize && resultSet.next()) {
            totalRowsScanned++;

            if (totalRowsScanned > maxRows) {
                truncated = true;
                truncationReason = "max_rows";
                break;
            }

            Map<String, Object> row = new LinkedHashMap<>(columnCount);
            long rowBytes = 0L;
            for (int i = 1; i <= columnCount; i++) {
                Object value = resultSet.getObject(i);
                row.put(columns.get(i - 1), value);
                rowBytes += estimateObjectBytes(value);
            }

            estimatedBytes += rowBytes;
            if (estimatedBytes > maxResultSizeBytes) {
                truncated = true;
                truncationReason = "max_result_size_bytes";
                break;
            }

            rows.add(row);
            rowsExtracted++;
        }

        // Continue scanning to count total rows for pagination
        if (!truncated) {
            while (resultSet.next()) {
                totalRowsScanned++;
                if (totalRowsScanned > maxRows) {
                    truncated = true;
                    truncationReason = "max_rows";
                    break;
                }
            }
        }

        return new StreamingResult(columns, rows, totalRowsScanned, truncated, truncationReason, estimatedBytes);
    }

    /**
     * Estimates the byte size of a Java object value for result-size tracking.
     * Uses a conservative estimate based on value type.
     */
    private long estimateObjectBytes(Object value) {
        if (value == null) {
            return 4L; // null reference overhead
        }
        if (value instanceof String s) {
            // 2 bytes per char (UTF-16) + object overhead
            return 40L + (long) s.length() * 2;
        }
        if (value instanceof byte[] bytes) {
            return 16L + bytes.length;
        }
        if (value instanceof Integer || value instanceof Float) {
            return 16L;
        }
        if (value instanceof Long || value instanceof Double) {
            return 24L;
        }
        if (value instanceof java.math.BigDecimal bd) {
            return 32L + (long) bd.toString().length() * 2;
        }
        if (value instanceof java.sql.Timestamp || value instanceof java.sql.Date) {
            return 32L;
        }
        if (value instanceof Boolean) {
            return 16L;
        }
        // Default estimate for unknown types
        return 48L + (long) value.toString().length() * 2;
    }

    /**
     * Cancels a JDBC Statement quietly, logging any errors.
     */
    private void cancelStatementQuietly(Statement statement) {
        if (statement != null) {
            try {
                statement.cancel();
            } catch (SQLException e) {
                log.debug("Error cancelling statement: {}", e.getMessage());
            }
        }
    }

    /**
     * Closes an AutoCloseable resource quietly, logging any errors.
     */
    private void closeQuietly(AutoCloseable resource) {
        if (resource != null) {
            try {
                resource.close();
            } catch (Exception e) {
                log.debug("Error closing resource: {}", e.getMessage());
            }
        }
    }

    /**
     * Truncates SQL for logging (avoid logging huge queries).
     */
    private String truncateSql(String sql) {
        if (sql == null) {
            return "null";
        }
        return sql.length() > 200 ? sql.substring(0, 200) + "..." : sql;
    }

    /**
     * Exception indicating query execution timeout.
     */
    public static class QueryTimeoutException extends RuntimeException {
        public QueryTimeoutException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    /**
     * Exception indicating a SQL execution error.
     */
    public static class QueryExecutionException extends RuntimeException {
        public QueryExecutionException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
