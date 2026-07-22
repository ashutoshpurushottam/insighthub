package com.insighthub.export;

import com.insighthub.execution.BindValue;
import com.insighthub.guardrails.GuardrailsConfigEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Streaming CSV export service that writes report query results directly to an OutputStream.
 *
 * <p>Design principles:</p>
 * <ul>
 *   <li>Streams rows from a JDBC cursor with configured fetchSize — never buffers all rows in memory</li>
 *   <li>Writes header + rows directly to OutputStream via PrintWriter (for streaming to HTTP response)</li>
 *   <li>Applies RFC 4180 quoting rules: fields containing commas, newlines, or double quotes
 *       are enclosed in double quotes, with internal double quotes escaped as ""</li>
 *   <li>Enforces max_export_rows guardrail — stops and logs when exceeded</li>
 * </ul>
 *
 * <p>Property 5: JVM heap usage remains O(fetchSize) regardless of total row count.</p>
 *
 * @see <a href="https://www.rfc-editor.org/rfc/rfc4180">RFC 4180 - Common Format and MIME Type for CSV Files</a>
 */
@Service
@Slf4j
public class CsvExportService {

    private static final char COMMA = ',';
    private static final char DOUBLE_QUOTE = '"';
    private static final String CRLF = "\r\n";

    /**
     * Exports report query results as CSV, streaming directly to the given OutputStream.
     *
     * <p>The method opens a JDBC connection with a forward-only cursor, writes the CSV header
     * row first, then streams data rows one at a time. Memory usage is bounded by the fetch size
     * configured on the Statement — rows are not accumulated in a collection.</p>
     *
     * @param dataSource  the JDBC DataSource to execute the query against
     * @param sql         the fully-substituted SQL query to execute
     * @param guardrails  the effective guardrails config (maxExportRows, executionTimeoutSeconds)
     * @param outputStream the target OutputStream (typically the HTTP response output stream)
     * @param reportName  the report name (used for logging context)
     */
    public void export(DataSource dataSource, String sql, GuardrailsConfigEntity guardrails,
                       OutputStream outputStream, String reportName) {
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

            // Configure fetch size to control memory usage (Property 5)
            // Use a reasonable batch size for export streaming
            int fetchSize = Math.min(1000, guardrails.getMaxExportRows());
            statement.setFetchSize(fetchSize);

            // Set query timeout from guardrails
            statement.setQueryTimeout(guardrails.getExecutionTimeoutSeconds());

            resultSet = statement.executeQuery(sql);

            // Extract column names from ResultSet metadata
            ResultSetMetaData metaData = resultSet.getMetaData();
            int columnCount = metaData.getColumnCount();
            List<String> columns = new ArrayList<>(columnCount);
            for (int i = 1; i <= columnCount; i++) {
                columns.add(metaData.getColumnLabel(i));
            }

            // Write CSV output using PrintWriter for streaming (no buffering of all rows)
            PrintWriter writer = new PrintWriter(
                    new OutputStreamWriter(outputStream, StandardCharsets.UTF_8), false);

            // Write header row with column names
            writeRow(writer, columns);

            // Stream data rows from cursor
            int maxExportRows = guardrails.getMaxExportRows();
            long rowCount = 0;
            boolean truncated = false;

            while (resultSet.next()) {
                rowCount++;

                // Enforce max export rows guardrail
                if (rowCount > maxExportRows) {
                    truncated = true;
                    log.warn("CSV export for report '{}' exceeded max export rows guardrail ({}). "
                                    + "Export stopped at {} rows.",
                            reportName, maxExportRows, maxExportRows);
                    break;
                }

                // Extract row values and write directly — no accumulation in memory
                List<String> rowValues = new ArrayList<>(columnCount);
                for (int i = 1; i <= columnCount; i++) {
                    Object value = resultSet.getObject(i);
                    rowValues.add(value != null ? value.toString() : "");
                }

                writeRow(writer, rowValues);
            }

            // Flush remaining buffered content to the OutputStream
            writer.flush();

            if (truncated) {
                log.info("CSV export for report '{}' completed with truncation at {} rows (max: {}).",
                        reportName, maxExportRows, maxExportRows);
            } else {
                log.info("CSV export for report '{}' completed successfully with {} rows.",
                        reportName, rowCount);
            }

        } catch (SQLTimeoutException e) {
            log.error("CSV export query timed out for report '{}' after {} seconds.",
                    reportName, guardrails.getExecutionTimeoutSeconds());
            throw new ExportException("Export query timed out after "
                    + guardrails.getExecutionTimeoutSeconds() + " seconds", e);
        } catch (SQLException e) {
            log.error("CSV export SQL error for report '{}': {}", reportName, e.getMessage());
            throw new ExportException("Export failed: " + e.getMessage(), e);
        } finally {
            // Release JDBC resources in reverse order
            closeQuietly(resultSet);
            closeQuietly(statement);
            closeQuietly(connection);
        }
    }

    /**
     * Exports report query results as CSV using a PreparedStatement with parameter bindings.
     *
     * <p>This overload supports the prepared statement execution path (Requirement 5.4).
     * It binds parameter values via {@code PreparedStatement.setXxx()} for SQL injection prevention.</p>
     *
     * @param dataSource   the JDBC DataSource to execute the query against
     * @param sql          the SQL query with {@code ?} positional placeholders
     * @param bindings     ordered list of binding values for the prepared statement
     * @param guardrails   the effective guardrails config (maxExportRows, executionTimeoutSeconds)
     * @param outputStream the target OutputStream (typically the HTTP response output stream)
     * @param reportName   the report name (used for logging context)
     */
    public void export(DataSource dataSource, String sql, List<BindValue> bindings,
                       GuardrailsConfigEntity guardrails, OutputStream outputStream, String reportName) {
        Connection connection = null;
        PreparedStatement preparedStatement = null;
        ResultSet resultSet = null;

        try {
            connection = dataSource.getConnection();

            preparedStatement = connection.prepareStatement(sql,
                    ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY);

            // Configure fetch size and timeout
            int fetchSize = Math.min(1000, guardrails.getMaxExportRows());
            preparedStatement.setFetchSize(fetchSize);
            preparedStatement.setQueryTimeout(guardrails.getExecutionTimeoutSeconds());

            // Bind parameters
            bindParameters(preparedStatement, bindings);

            resultSet = preparedStatement.executeQuery();

            // Extract column names from ResultSet metadata
            ResultSetMetaData metaData = resultSet.getMetaData();
            int columnCount = metaData.getColumnCount();
            List<String> columns = new ArrayList<>(columnCount);
            for (int i = 1; i <= columnCount; i++) {
                columns.add(metaData.getColumnLabel(i));
            }

            // Write CSV output using PrintWriter for streaming
            PrintWriter writer = new PrintWriter(
                    new OutputStreamWriter(outputStream, StandardCharsets.UTF_8), false);

            // Write header row
            writeRow(writer, columns);

            // Stream data rows from cursor
            int maxExportRows = guardrails.getMaxExportRows();
            long rowCount = 0;
            boolean truncated = false;

            while (resultSet.next()) {
                rowCount++;

                if (rowCount > maxExportRows) {
                    truncated = true;
                    log.warn("CSV export for report '{}' exceeded max export rows guardrail ({}). "
                                    + "Export stopped at {} rows.",
                            reportName, maxExportRows, maxExportRows);
                    break;
                }

                List<String> rowValues = new ArrayList<>(columnCount);
                for (int i = 1; i <= columnCount; i++) {
                    Object value = resultSet.getObject(i);
                    rowValues.add(value != null ? value.toString() : "");
                }

                writeRow(writer, rowValues);
            }

            writer.flush();

            if (truncated) {
                log.info("CSV export for report '{}' completed with truncation at {} rows (max: {}).",
                        reportName, maxExportRows, maxExportRows);
            } else {
                log.info("CSV export for report '{}' completed successfully with {} rows.",
                        reportName, rowCount);
            }

        } catch (SQLTimeoutException e) {
            log.error("CSV export query timed out for report '{}' after {} seconds.",
                    reportName, guardrails.getExecutionTimeoutSeconds());
            throw new ExportException("Export query timed out after "
                    + guardrails.getExecutionTimeoutSeconds() + " seconds", e);
        } catch (SQLException e) {
            log.error("CSV export SQL error for report '{}': {}", reportName, e.getMessage());
            throw new ExportException("Export failed: " + e.getMessage(), e);
        } finally {
            closeQuietly(resultSet);
            closeQuietly(preparedStatement);
            closeQuietly(connection);
        }
    }

    /**
     * Binds parameter values to a PreparedStatement using their declared JDBC types.
     *
     * @param stmt     the PreparedStatement to bind values to
     * @param bindings the ordered list of binding values
     * @throws SQLException if a binding operation fails
     */
    private void bindParameters(PreparedStatement stmt, List<BindValue> bindings) throws SQLException {
        for (int i = 0; i < bindings.size(); i++) {
            BindValue binding = bindings.get(i);
            int paramIndex = i + 1;

            if (binding.value() == null) {
                stmt.setNull(paramIndex, binding.jdbcType());
            } else {
                stmt.setObject(paramIndex, binding.value(), binding.jdbcType());
            }
        }
    }

    /**
     * Writes a single CSV row (header or data) to the PrintWriter.
     * Fields are separated by commas and terminated with CRLF per RFC 4180.
     *
     * @param writer the PrintWriter to write to
     * @param fields the list of field values to write
     */
    private void writeRow(PrintWriter writer, List<String> fields) {
        for (int i = 0; i < fields.size(); i++) {
            if (i > 0) {
                writer.write(COMMA);
            }
            writer.write(quoteField(fields.get(i)));
        }
        writer.write(CRLF);
    }

    /**
     * Applies RFC 4180 quoting rules to a single field value.
     *
     * <p>Rules:</p>
     * <ul>
     *   <li>If the field contains a comma, newline (\n or \r), or double quote,
     *       it must be enclosed in double quotes.</li>
     *   <li>Double quotes within a field are escaped by doubling them ("" represents ").</li>
     *   <li>Fields that don't contain special characters are written as-is (no quoting).</li>
     * </ul>
     *
     * @param field the raw field value
     * @return the RFC 4180 compliant representation of the field
     */
    String quoteField(String field) {
        if (field == null || field.isEmpty()) {
            return "";
        }

        boolean needsQuoting = false;
        for (int i = 0; i < field.length(); i++) {
            char c = field.charAt(i);
            if (c == COMMA || c == DOUBLE_QUOTE || c == '\n' || c == '\r') {
                needsQuoting = true;
                break;
            }
        }

        if (!needsQuoting) {
            return field;
        }

        // Enclose in double quotes and escape internal double quotes
        StringBuilder sb = new StringBuilder(field.length() + 4);
        sb.append(DOUBLE_QUOTE);
        for (int i = 0; i < field.length(); i++) {
            char c = field.charAt(i);
            if (c == DOUBLE_QUOTE) {
                sb.append(DOUBLE_QUOTE); // escape " as ""
            }
            sb.append(c);
        }
        sb.append(DOUBLE_QUOTE);
        return sb.toString();
    }

    /**
     * Closes an AutoCloseable resource quietly, logging any errors at debug level.
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
     * Exception indicating an export operation failure.
     */
    public static class ExportException extends RuntimeException {
        public ExportException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
