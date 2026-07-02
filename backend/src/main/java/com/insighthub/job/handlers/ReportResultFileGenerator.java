package com.insighthub.job.handlers;

import com.insighthub.report.RunReportResult;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Generates file bytes (CSV, XLSX, PDF) from an in-memory {@link RunReportResult}.
 * <p>
 * Used by job output handlers to produce attachment/publish files from report data
 * that has already been executed and loaded into memory.
 * </p>
 */
@Component
public class ReportResultFileGenerator {

    private static final Logger log = LoggerFactory.getLogger(ReportResultFileGenerator.class);

    private static final char COMMA = ',';
    private static final char DOUBLE_QUOTE = '"';
    private static final String CRLF = "\r\n";
    private static final int SXSSF_WINDOW_SIZE = 100;

    /**
     * Result of file generation containing the bytes and metadata.
     */
    public record GeneratedFile(byte[] data, String filename, String contentType) {
    }

    /**
     * Generates a file from report results in the specified format.
     *
     * @param result     the report execution result
     * @param format     the output format (CSV, XLSX, PDF)
     * @param reportName the report name used for the filename
     * @return a GeneratedFile with the bytes, filename, and content type
     */
    public GeneratedFile generate(RunReportResult result, String format, String reportName) {
        String safeReportName = sanitizeFilename(reportName);

        return switch (format.toUpperCase()) {
            case "XLSX" -> generateXlsx(result, safeReportName);
            case "PDF" -> generatePdf(result, safeReportName);
            default -> generateCsv(result, safeReportName);
        };
    }

    /**
     * Generates CSV bytes from the report result.
     * Uses RFC 4180 quoting rules for proper field escaping.
     */
    GeneratedFile generateCsv(RunReportResult result, String reportName) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8), false);

        List<String> columns = result.getColumns();

        // Write header row
        writeRow(writer, columns);

        // Write data rows
        for (Map<String, Object> row : result.getRows()) {
            List<String> values = columns.stream()
                    .map(col -> {
                        Object val = row.get(col);
                        return val != null ? val.toString() : "";
                    })
                    .toList();
            writeRow(writer, values);
        }

        writer.flush();

        String filename = reportName + ".csv";
        log.debug("Generated CSV file '{}' with {} rows", filename, result.getRowCount());
        return new GeneratedFile(baos.toByteArray(), filename, "text/csv");
    }

    /**
     * Generates XLSX bytes from the report result using Apache POI's SXSSFWorkbook.
     */
    GeneratedFile generateXlsx(RunReportResult result, String reportName) {
        SXSSFWorkbook workbook = null;
        try {
            workbook = new SXSSFWorkbook(SXSSF_WINDOW_SIZE);
            workbook.setCompressTempFiles(true);

            SXSSFSheet sheet = workbook.createSheet("Report");
            List<String> columns = result.getColumns();

            // Track columns for auto-sizing
            for (int i = 0; i < columns.size(); i++) {
                sheet.trackColumnForAutoSizing(i);
            }

            // Create bold header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            // Write header row
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns.get(i));
                cell.setCellStyle(headerStyle);
            }

            // Write data rows
            List<Map<String, Object>> rows = result.getRows();
            for (int rowIdx = 0; rowIdx < rows.size(); rowIdx++) {
                Row dataRow = sheet.createRow(rowIdx + 1);
                Map<String, Object> rowData = rows.get(rowIdx);
                for (int colIdx = 0; colIdx < columns.size(); colIdx++) {
                    Cell cell = dataRow.createCell(colIdx);
                    Object value = rowData.get(columns.get(colIdx));
                    setCellValue(cell, value);
                }

                // Flush periodically to keep memory bounded
                if ((rowIdx + 1) % SXSSF_WINDOW_SIZE == 0) {
                    sheet.flushRows(SXSSF_WINDOW_SIZE);
                }
            }

            // Auto-size columns
            for (int i = 0; i < columns.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            // Write to byte array
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            baos.flush();

            String filename = reportName + ".xlsx";
            log.debug("Generated XLSX file '{}' with {} rows", filename, result.getRowCount());
            return new GeneratedFile(baos.toByteArray(), filename,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        } catch (IOException e) {
            log.error("Failed to generate XLSX, falling back to CSV: {}", e.getMessage());
            return generateCsv(result, reportName);
        } finally {
            if (workbook != null) {
                workbook.dispose();
            }
        }
    }

    /**
     * Generates PDF bytes from the report result.
     * TODO: Implement proper PDF generation using OpenPDF. Currently falls back to CSV.
     */
    GeneratedFile generatePdf(RunReportResult result, String reportName) {
        // TODO: Implement PDF generation from in-memory RunReportResult using OpenPDF.
        //       For now, generate CSV as a placeholder.
        log.warn("PDF generation from in-memory results not yet implemented. Generating CSV as fallback for '{}'", reportName);
        GeneratedFile csv = generateCsv(result, reportName);
        String filename = reportName + ".csv";
        return new GeneratedFile(csv.data(), filename, "text/csv");
    }

    /**
     * Sets a cell value based on the runtime type of the value object.
     */
    private void setCellValue(Cell cell, Object value) {
        if (value == null) {
            cell.setBlank();
            return;
        }

        if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
        } else if (value instanceof Boolean bool) {
            cell.setCellValue(bool);
        } else {
            cell.setCellValue(value.toString());
        }
    }

    /**
     * Writes a single CSV row to the PrintWriter.
     * Fields are separated by commas and terminated with CRLF per RFC 4180.
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
     */
    private String quoteField(String field) {
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

        StringBuilder sb = new StringBuilder(field.length() + 4);
        sb.append(DOUBLE_QUOTE);
        for (int i = 0; i < field.length(); i++) {
            char c = field.charAt(i);
            if (c == DOUBLE_QUOTE) {
                sb.append(DOUBLE_QUOTE);
            }
            sb.append(c);
        }
        sb.append(DOUBLE_QUOTE);
        return sb.toString();
    }

    /**
     * Sanitizes a report name for use as a filename.
     * Removes characters that are invalid in file names.
     */
    private String sanitizeFilename(String name) {
        if (name == null || name.isBlank()) {
            return "report";
        }
        return name.replaceAll("[^a-zA-Z0-9._\\-\\s]", "")
                .replaceAll("\\s+", "_")
                .trim();
    }
}
