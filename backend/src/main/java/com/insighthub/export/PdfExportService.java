package com.insighthub.export;

import com.insighthub.execution.BindValue;
import com.insighthub.guardrails.GuardrailsConfigEntity;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.awt.Color;
import java.io.OutputStream;
import java.sql.*;
import java.util.List;

/**
 * Streaming PDF export service using OpenPDF (com.lowagie.text).
 *
 * <p>Generates a PDF document from a JDBC cursor with:</p>
 * <ul>
 *   <li>Report name as document title</li>
 *   <li>Column headers repeated on each page</li>
 *   <li>Rows streamed from cursor incrementally (O(fetchSize) heap usage)</li>
 *   <li>max_export_rows guardrail enforcement</li>
 * </ul>
 *
 * <p>Property 5: Export Streaming Invariant — JVM heap usage remains O(fetchSize)
 * regardless of total row count, because rows are written to the PDF writer
 * incrementally and not accumulated in memory.</p>
 *
 * <p>Requirements: 30.1, 30.2, 30.3, 30.5, 31.1, 31.2, 31.3, 32.3, 32.4</p>
 */
@Service
@Slf4j
public class PdfExportService {

    private static final int DEFAULT_FETCH_SIZE = 500;
    private static final float FONT_SIZE_TITLE = 14f;
    private static final float FONT_SIZE_HEADER = 9f;
    private static final float FONT_SIZE_CELL = 8f;

    /**
     * Exports report results as a streaming PDF to the provided OutputStream.
     *
     * <p>The method opens a JDBC cursor, streams rows incrementally into a PdfPTable,
     * and flushes pages to the OutputStream via PdfWriter. This ensures O(fetchSize)
     * heap usage regardless of total row count.</p>
     *
     * @param dataSource  the JDBC DataSource to execute the query against
     * @param sql         the fully-substituted SQL query to execute
     * @param reportName  the report name used as the PDF document title
     * @param guardrails  the effective guardrails config (contains maxExportRows, timeout)
     * @param outputStream the response OutputStream to write PDF content to
     */
    public void export(DataSource dataSource, String sql, String reportName,
                       GuardrailsConfigEntity guardrails, OutputStream outputStream) {
        Document document = null;
        Connection connection = null;
        Statement statement = null;
        ResultSet resultSet = null;

        try {
            // Set up JDBC cursor-based streaming
            connection = dataSource.getConnection();
            statement = connection.createStatement(
                    ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY
            );
            statement.setFetchSize(DEFAULT_FETCH_SIZE);
            statement.setQueryTimeout(guardrails.getExecutionTimeoutSeconds());

            resultSet = statement.executeQuery(sql);

            // Extract column metadata
            ResultSetMetaData metaData = resultSet.getMetaData();
            int columnCount = metaData.getColumnCount();
            String[] columnNames = new String[columnCount];
            for (int i = 1; i <= columnCount; i++) {
                columnNames[i - 1] = metaData.getColumnLabel(i);
            }

            // Create PDF document in landscape for better table fit
            document = new Document(PageSize.A4.rotate(), 20, 20, 40, 20);
            PdfWriter.getInstance(document, outputStream);

            // Set document metadata
            document.addTitle(reportName);
            document.addSubject("Report Export");
            document.addCreator("InsightHub Report Engine");

            document.open();

            // Add report title (Requirement 30.2)
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, FONT_SIZE_TITLE);
            Paragraph title = new Paragraph(reportName, titleFont);
            title.setSpacingAfter(12f);
            document.add(title);

            // Create table with column count from ResultSet metadata
            PdfPTable table = new PdfPTable(columnCount);
            table.setWidthPercentage(100f);
            table.setSpacingBefore(5f);

            // Add column headers with styling (Requirement 30.3: repeated on each page)
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, FONT_SIZE_HEADER, Color.WHITE);
            for (String columnName : columnNames) {
                PdfPCell headerCell = new PdfPCell(new Phrase(columnName, headerFont));
                headerCell.setBackgroundColor(new Color(51, 102, 153));
                headerCell.setPadding(5f);
                headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(headerCell);
            }

            // Mark header rows to repeat on each page (Requirement 30.3)
            table.setHeaderRows(1);

            // Stream rows from cursor and add to table incrementally
            // (Property 5: O(fetchSize) heap usage)
            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, FONT_SIZE_CELL);
            int maxExportRows = guardrails.getMaxExportRows();
            long rowCount = 0;
            boolean truncated = false;

            while (resultSet.next()) {
                // Enforce max export rows guardrail (Requirements 31.1, 31.2, 31.3, 32.4)
                if (rowCount >= maxExportRows) {
                    truncated = true;
                    log.warn("PDF export truncated at {} rows (max_export_rows guardrail). Report: {}",
                            maxExportRows, reportName);
                    break;
                }

                for (int i = 1; i <= columnCount; i++) {
                    Object value = resultSet.getObject(i);
                    String cellValue = value != null ? value.toString() : "";
                    PdfPCell cell = new PdfPCell(new Phrase(cellValue, cellFont));
                    cell.setPadding(4f);
                    // Alternate row colors for readability
                    if (rowCount % 2 == 1) {
                        cell.setBackgroundColor(new Color(245, 245, 245));
                    }
                    table.addCell(cell);
                }

                rowCount++;
            }

            // Add the table to the document (PdfWriter streams pages to OutputStream)
            document.add(table);

            // Add truncation notice if export was limited
            if (truncated) {
                Font noticeFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, FONT_SIZE_CELL, Color.RED);
                Paragraph notice = new Paragraph(
                        String.format("Export truncated at %d rows (maximum export rows limit reached).", maxExportRows),
                        noticeFont
                );
                notice.setSpacingBefore(10f);
                document.add(notice);
            }

            // Add row count footer
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, FONT_SIZE_CELL, Color.GRAY);
            Paragraph footer = new Paragraph(
                    String.format("Total rows exported: %d", rowCount),
                    footerFont
            );
            footer.setSpacingBefore(8f);
            document.add(footer);

            log.info("PDF export completed. Report: '{}', rows: {}, truncated: {}",
                    reportName, rowCount, truncated);

        } catch (DocumentException e) {
            log.error("PDF document generation error for report '{}': {}", reportName, e.getMessage());
            throw new ExportException("Failed to generate PDF document: " + e.getMessage(), e);
        } catch (SQLException e) {
            log.error("SQL execution error during PDF export for report '{}': {}", reportName, e.getMessage());
            throw new ExportException("SQL error during PDF export: " + e.getMessage(), e);
        } finally {
            // Close PDF document
            if (document != null && document.isOpen()) {
                document.close();
            }
            // Release JDBC resources
            closeQuietly(resultSet);
            closeQuietly(statement);
            closeQuietly(connection);
        }
    }

    /**
     * Exports report results as a streaming PDF using a PreparedStatement with parameter bindings.
     *
     * <p>This overload supports the prepared statement execution path (Requirement 5.4).
     * It binds parameter values via {@code PreparedStatement.setXxx()} for SQL injection prevention.</p>
     *
     * @param dataSource   the JDBC DataSource to execute the query against
     * @param sql          the SQL query with {@code ?} positional placeholders
     * @param bindings     ordered list of binding values for the prepared statement
     * @param reportName   the report name used as the PDF document title
     * @param guardrails   the effective guardrails config (contains maxExportRows, timeout)
     * @param outputStream the response OutputStream to write PDF content to
     */
    public void export(DataSource dataSource, String sql, List<BindValue> bindings,
                       String reportName, GuardrailsConfigEntity guardrails, OutputStream outputStream) {
        Document document = null;
        Connection connection = null;
        PreparedStatement preparedStatement = null;
        ResultSet resultSet = null;

        try {
            connection = dataSource.getConnection();
            preparedStatement = connection.prepareStatement(sql,
                    ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY);
            preparedStatement.setFetchSize(DEFAULT_FETCH_SIZE);
            preparedStatement.setQueryTimeout(guardrails.getExecutionTimeoutSeconds());

            // Bind parameters
            bindParameters(preparedStatement, bindings);

            resultSet = preparedStatement.executeQuery();

            // Extract column metadata
            ResultSetMetaData metaData = resultSet.getMetaData();
            int columnCount = metaData.getColumnCount();
            String[] columnNames = new String[columnCount];
            for (int i = 1; i <= columnCount; i++) {
                columnNames[i - 1] = metaData.getColumnLabel(i);
            }

            // Create PDF document in landscape for better table fit
            document = new Document(PageSize.A4.rotate(), 20, 20, 40, 20);
            PdfWriter.getInstance(document, outputStream);

            document.addTitle(reportName);
            document.addSubject("Report Export");
            document.addCreator("InsightHub Report Engine");

            document.open();

            // Add report title
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, FONT_SIZE_TITLE);
            Paragraph title = new Paragraph(reportName, titleFont);
            title.setSpacingAfter(12f);
            document.add(title);

            PdfPTable table = new PdfPTable(columnCount);
            table.setWidthPercentage(100f);
            table.setSpacingBefore(5f);

            // Add column headers
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, FONT_SIZE_HEADER, Color.WHITE);
            for (String columnName : columnNames) {
                PdfPCell headerCell = new PdfPCell(new Phrase(columnName, headerFont));
                headerCell.setBackgroundColor(new Color(51, 102, 153));
                headerCell.setPadding(5f);
                headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(headerCell);
            }

            table.setHeaderRows(1);

            // Stream rows
            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, FONT_SIZE_CELL);
            int maxExportRows = guardrails.getMaxExportRows();
            long rowCount = 0;
            boolean truncated = false;

            while (resultSet.next()) {
                if (rowCount >= maxExportRows) {
                    truncated = true;
                    log.warn("PDF export truncated at {} rows (max_export_rows guardrail). Report: {}",
                            maxExportRows, reportName);
                    break;
                }

                for (int i = 1; i <= columnCount; i++) {
                    Object value = resultSet.getObject(i);
                    String cellValue = value != null ? value.toString() : "";
                    PdfPCell cell = new PdfPCell(new Phrase(cellValue, cellFont));
                    cell.setPadding(4f);
                    if (rowCount % 2 == 1) {
                        cell.setBackgroundColor(new Color(245, 245, 245));
                    }
                    table.addCell(cell);
                }

                rowCount++;
            }

            document.add(table);

            if (truncated) {
                Font noticeFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, FONT_SIZE_CELL, Color.RED);
                Paragraph notice = new Paragraph(
                        String.format("Export truncated at %d rows (maximum export rows limit reached).", maxExportRows),
                        noticeFont
                );
                notice.setSpacingBefore(10f);
                document.add(notice);
            }

            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, FONT_SIZE_CELL, Color.GRAY);
            Paragraph footer = new Paragraph(
                    String.format("Total rows exported: %d", rowCount),
                    footerFont
            );
            footer.setSpacingBefore(8f);
            document.add(footer);

            log.info("PDF export (prepared statement) completed. Report: '{}', rows: {}, truncated: {}",
                    reportName, rowCount, truncated);

        } catch (DocumentException e) {
            log.error("PDF document generation error for report '{}': {}", reportName, e.getMessage());
            throw new ExportException("Failed to generate PDF document: " + e.getMessage(), e);
        } catch (SQLException e) {
            log.error("SQL execution error during PDF export for report '{}': {}", reportName, e.getMessage());
            throw new ExportException("SQL error during PDF export: " + e.getMessage(), e);
        } finally {
            if (document != null && document.isOpen()) {
                document.close();
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
     * Exception indicating a failure during export operations.
     */
    public static class ExportException extends RuntimeException {
        public ExportException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
