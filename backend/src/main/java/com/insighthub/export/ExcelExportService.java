package com.insighthub.export;

import com.insighthub.execution.BindValue;
import com.insighthub.guardrails.GuardrailsConfigEntity;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.OutputStream;
import java.sql.*;
import java.util.List;

/**
 * Streaming XLSX export service using Apache POI's SXSSFWorkbook.
 *
 * <p>Design characteristics:</p>
 * <ul>
 *   <li>SXSSFWorkbook with 100-row memory window — only 100 rows in JVM heap at any time</li>
 *   <li>Bold header row with column names from ResultSet metadata</li>
 *   <li>Auto-size columns based on header content (tracked columns)</li>
 *   <li>Streams rows from JDBC cursor, flushing to disk periodically</li>
 *   <li>Enforces max_export_rows guardrail; stops writing when limit exceeded</li>
 *   <li>Writes directly to the provided OutputStream</li>
 * </ul>
 *
 * <p>Property 5: Export Streaming Invariant — JVM heap usage remains O(fetchSize)
 * regardless of the total row count in the result set.</p>
 */
@Service
@Slf4j
public class ExcelExportService {

    /**
     * Memory window size for SXSSFWorkbook. Only this many rows are kept in memory;
     * older rows are flushed to temporary disk storage automatically.
     */
    private static final int SXSSF_WINDOW_SIZE = 100;

    /**
     * Number of rows between explicit flush calls to disk.
     * Keeps memory bounded even when SXSSFWorkbook internal flush timing varies.
     */
    private static final int FLUSH_INTERVAL = 100;

    /**
     * Default JDBC fetch size for cursor-based streaming.
     */
    private static final int DEFAULT_FETCH_SIZE = 100;

    /**
     * Result of an export operation containing row count and truncation info.
     */
    public record ExportResult(
            long rowsExported,
            boolean truncated,
            String truncationReason
    ) {}

    /**
     * Exports report results as a streaming XLSX file written directly to the OutputStream.
     *
     * <p>Uses cursor-based JDBC streaming to read rows and SXSSFWorkbook with a 100-row
     * memory window to write them, ensuring O(fetchSize) heap usage regardless of result size.</p>
     *
     * @param dataSource the JDBC DataSource to execute the query against
     * @param sql        the fully-substituted SQL query to execute
     * @param guardrails the effective guardrails config (max_export_rows, timeout)
     * @param outputStream the OutputStream to write the XLSX content to
     * @return ExportResult with row count and truncation information
     * @throws IOException if an I/O error occurs writing to the OutputStream
     */
    public ExportResult export(DataSource dataSource, String sql,
                               GuardrailsConfigEntity guardrails,
                               OutputStream outputStream) throws IOException {
        int maxExportRows = guardrails.getMaxExportRows();
        int timeoutSeconds = guardrails.getExecutionTimeoutSeconds();

        Connection connection = null;
        Statement statement = null;
        ResultSet resultSet = null;
        SXSSFWorkbook workbook = null;

        long rowsExported = 0;
        boolean truncated = false;
        String truncationReason = null;

        try {
            connection = dataSource.getConnection();

            // Use forward-only, read-only ResultSet for cursor-based streaming
            statement = connection.createStatement(
                    ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY
            );
            statement.setFetchSize(DEFAULT_FETCH_SIZE);
            statement.setQueryTimeout(timeoutSeconds);

            resultSet = statement.executeQuery(sql);

            // Extract column metadata
            ResultSetMetaData metaData = resultSet.getMetaData();
            int columnCount = metaData.getColumnCount();
            String[] columnNames = new String[columnCount];
            for (int i = 0; i < columnCount; i++) {
                columnNames[i] = metaData.getColumnLabel(i + 1);
            }

            // Create SXSSFWorkbook with 100-row memory window
            workbook = new SXSSFWorkbook(SXSSF_WINDOW_SIZE);
            workbook.setCompressTempFiles(true);

            SXSSFSheet sheet = workbook.createSheet("Report");

            // Track columns for auto-sizing (must be done before writing rows)
            for (int i = 0; i < columnCount; i++) {
                sheet.trackColumnForAutoSizing(i);
            }

            // Create bold header style
            CellStyle headerStyle = createHeaderStyle(workbook);

            // Write bold header row
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columnCount; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columnNames[i]);
                cell.setCellStyle(headerStyle);
            }

            // Stream data rows from JDBC cursor
            int rowIndex = 1; // Start after header row
            while (resultSet.next()) {
                // Enforce max export rows guardrail
                if (rowsExported >= maxExportRows) {
                    truncated = true;
                    truncationReason = "max_export_rows";
                    log.warn("Export truncated at {} rows (max_export_rows guardrail)", maxExportRows);
                    break;
                }

                Row dataRow = sheet.createRow(rowIndex);
                for (int i = 0; i < columnCount; i++) {
                    Cell cell = dataRow.createCell(i);
                    setCellValue(cell, resultSet, i + 1, metaData.getColumnType(i + 1));
                }

                rowsExported++;
                rowIndex++;

                // Flush rows to disk periodically to keep memory bounded
                if (rowsExported % FLUSH_INTERVAL == 0) {
                    sheet.flushRows(SXSSF_WINDOW_SIZE);
                }
            }

            // Auto-size columns based on content (uses tracked column data)
            for (int i = 0; i < columnCount; i++) {
                sheet.autoSizeColumn(i);
            }

            // Write workbook to output stream
            workbook.write(outputStream);
            outputStream.flush();

            log.info("XLSX export completed: {} rows exported, truncated={}", rowsExported, truncated);
            return new ExportResult(rowsExported, truncated, truncationReason);

        } catch (SQLTimeoutException e) {
            log.warn("Export query timed out after {} seconds", timeoutSeconds);
            throw new ExportException("Export query timed out after " + timeoutSeconds + " seconds", e);
        } catch (SQLException e) {
            log.error("SQL error during XLSX export: {}", e.getMessage());
            throw new ExportException("SQL error during export: " + e.getMessage(), e);
        } finally {
            // Dispose SXSSFWorkbook to clean up temporary files
            if (workbook != null) {
                workbook.dispose();
            }
            // Release JDBC resources in reverse order
            closeQuietly(resultSet);
            closeQuietly(statement);
            closeQuietly(connection);
        }
    }

    /**
     * Exports report results as a streaming XLSX file using a PreparedStatement with parameter bindings.
     *
     * <p>This overload supports the prepared statement execution path (Requirement 5.4).
     * It binds parameter values via {@code PreparedStatement.setXxx()} for SQL injection prevention.</p>
     *
     * @param dataSource   the JDBC DataSource to execute the query against
     * @param sql          the SQL query with {@code ?} positional placeholders
     * @param bindings     ordered list of binding values for the prepared statement
     * @param guardrails   the effective guardrails config (max_export_rows, timeout)
     * @param outputStream the OutputStream to write the XLSX content to
     * @return ExportResult with row count and truncation information
     * @throws IOException if an I/O error occurs writing to the OutputStream
     */
    public ExportResult export(DataSource dataSource, String sql, List<BindValue> bindings,
                               GuardrailsConfigEntity guardrails,
                               OutputStream outputStream) throws IOException {
        int maxExportRows = guardrails.getMaxExportRows();
        int timeoutSeconds = guardrails.getExecutionTimeoutSeconds();

        Connection connection = null;
        PreparedStatement preparedStatement = null;
        ResultSet resultSet = null;
        SXSSFWorkbook workbook = null;

        long rowsExported = 0;
        boolean truncated = false;
        String truncationReason = null;

        try {
            connection = dataSource.getConnection();

            preparedStatement = connection.prepareStatement(sql,
                    ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY);
            preparedStatement.setFetchSize(DEFAULT_FETCH_SIZE);
            preparedStatement.setQueryTimeout(timeoutSeconds);

            // Bind parameters
            bindParameters(preparedStatement, bindings);

            resultSet = preparedStatement.executeQuery();

            // Extract column metadata
            ResultSetMetaData metaData = resultSet.getMetaData();
            int columnCount = metaData.getColumnCount();
            String[] columnNames = new String[columnCount];
            for (int i = 0; i < columnCount; i++) {
                columnNames[i] = metaData.getColumnLabel(i + 1);
            }

            // Create SXSSFWorkbook with 100-row memory window
            workbook = new SXSSFWorkbook(SXSSF_WINDOW_SIZE);
            workbook.setCompressTempFiles(true);

            SXSSFSheet sheet = workbook.createSheet("Report");

            for (int i = 0; i < columnCount; i++) {
                sheet.trackColumnForAutoSizing(i);
            }

            CellStyle headerStyle = createHeaderStyle(workbook);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columnCount; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columnNames[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 1;
            while (resultSet.next()) {
                if (rowsExported >= maxExportRows) {
                    truncated = true;
                    truncationReason = "max_export_rows";
                    log.warn("Export truncated at {} rows (max_export_rows guardrail)", maxExportRows);
                    break;
                }

                Row dataRow = sheet.createRow(rowIndex);
                for (int i = 0; i < columnCount; i++) {
                    Cell cell = dataRow.createCell(i);
                    setCellValue(cell, resultSet, i + 1, metaData.getColumnType(i + 1));
                }

                rowsExported++;
                rowIndex++;

                if (rowsExported % FLUSH_INTERVAL == 0) {
                    sheet.flushRows(SXSSF_WINDOW_SIZE);
                }
            }

            for (int i = 0; i < columnCount; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(outputStream);
            outputStream.flush();

            log.info("XLSX export (prepared statement) completed: {} rows exported, truncated={}", rowsExported, truncated);
            return new ExportResult(rowsExported, truncated, truncationReason);

        } catch (SQLTimeoutException e) {
            log.warn("Export query timed out after {} seconds", timeoutSeconds);
            throw new ExportException("Export query timed out after " + timeoutSeconds + " seconds", e);
        } catch (SQLException e) {
            log.error("SQL error during XLSX export: {}", e.getMessage());
            throw new ExportException("SQL error during export: " + e.getMessage(), e);
        } finally {
            if (workbook != null) {
                workbook.dispose();
            }
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
     * Creates a bold header cell style for the workbook.
     */
    private CellStyle createHeaderStyle(SXSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    /**
     * Sets the cell value based on the JDBC column type for proper Excel typing.
     */
    private void setCellValue(Cell cell, ResultSet rs, int columnIndex, int sqlType) throws SQLException {
        Object value = rs.getObject(columnIndex);
        if (rs.wasNull() || value == null) {
            cell.setBlank();
            return;
        }

        switch (sqlType) {
            case Types.INTEGER, Types.SMALLINT, Types.TINYINT ->
                    cell.setCellValue(rs.getInt(columnIndex));
            case Types.BIGINT ->
                    cell.setCellValue(rs.getLong(columnIndex));
            case Types.FLOAT, Types.REAL ->
                    cell.setCellValue(rs.getFloat(columnIndex));
            case Types.DOUBLE ->
                    cell.setCellValue(rs.getDouble(columnIndex));
            case Types.DECIMAL, Types.NUMERIC ->
                    cell.setCellValue(rs.getBigDecimal(columnIndex).doubleValue());
            case Types.BOOLEAN, Types.BIT ->
                    cell.setCellValue(rs.getBoolean(columnIndex));
            case Types.DATE -> {
                Date date = rs.getDate(columnIndex);
                cell.setCellValue(date != null ? date.toString() : "");
            }
            case Types.TIMESTAMP, Types.TIMESTAMP_WITH_TIMEZONE -> {
                Timestamp timestamp = rs.getTimestamp(columnIndex);
                cell.setCellValue(timestamp != null ? timestamp.toString() : "");
            }
            case Types.TIME -> {
                var time = rs.getTime(columnIndex);
                cell.setCellValue(time != null ? time.toString() : "");
            }
            default ->
                    cell.setCellValue(value.toString());
        }
    }

    /**
     * Closes a JDBC resource quietly, logging any errors without re-throwing.
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
     * Exception indicating an error during export operation.
     */
    public static class ExportException extends RuntimeException {
        public ExportException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
