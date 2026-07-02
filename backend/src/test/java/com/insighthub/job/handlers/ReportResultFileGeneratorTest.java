package com.insighthub.job.handlers;

import com.insighthub.report.RunReportResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ReportResultFileGeneratorTest {

    private ReportResultFileGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new ReportResultFileGenerator();
    }

    @Test
    void generateCsv_producesHeaderAndDataRows() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "name", "amount"))
                .rows(List.of(
                        Map.of("id", 1, "name", "Widget", "amount", 9.99),
                        Map.of("id", 2, "name", "Gadget", "amount", 19.99)
                ))
                .rowCount(2)
                .build();

        // Act
        ReportResultFileGenerator.GeneratedFile file = generator.generate(result, "CSV", "Test Report");

        // Assert
        assertNotNull(file);
        assertEquals("Test_Report.csv", file.filename());
        assertEquals("text/csv", file.contentType());

        String csv = new String(file.data(), StandardCharsets.UTF_8);
        String[] lines = csv.split("\r\n");
        assertEquals(3, lines.length); // header + 2 data rows
        assertEquals("id,name,amount", lines[0]);
        assertTrue(lines[1].contains("Widget"));
        assertTrue(lines[2].contains("Gadget"));
    }

    @Test
    void generateCsv_escapesFieldsWithCommas() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("description"))
                .rows(List.of(Map.of("description", "Hello, World")))
                .rowCount(1)
                .build();

        // Act
        ReportResultFileGenerator.GeneratedFile file = generator.generate(result, "CSV", "test");

        // Assert
        String csv = new String(file.data(), StandardCharsets.UTF_8);
        assertTrue(csv.contains("\"Hello, World\""));
    }

    @Test
    void generateCsv_escapesFieldsWithDoubleQuotes() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("text"))
                .rows(List.of(Map.of("text", "She said \"hi\"")))
                .rowCount(1)
                .build();

        // Act
        ReportResultFileGenerator.GeneratedFile file = generator.generate(result, "CSV", "test");

        // Assert
        String csv = new String(file.data(), StandardCharsets.UTF_8);
        assertTrue(csv.contains("\"She said \"\"hi\"\"\""));
    }

    @Test
    void generateCsv_handlesNullValues() {
        // Arrange - map entry will be missing the "amount" key
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "amount"))
                .rows(List.of(Map.of("id", 1)))
                .rowCount(1)
                .build();

        // Act
        ReportResultFileGenerator.GeneratedFile file = generator.generate(result, "CSV", "test");

        // Assert
        String csv = new String(file.data(), StandardCharsets.UTF_8);
        String[] lines = csv.split("\r\n");
        assertEquals("1,", lines[1]); // null value becomes empty string
    }

    @Test
    void generateCsv_handlesEmptyResult() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "name"))
                .rows(List.of())
                .rowCount(0)
                .build();

        // Act
        ReportResultFileGenerator.GeneratedFile file = generator.generate(result, "CSV", "empty");

        // Assert
        String csv = new String(file.data(), StandardCharsets.UTF_8);
        String[] lines = csv.split("\r\n");
        assertEquals(1, lines.length); // header only
        assertEquals("id,name", lines[0]);
    }

    @Test
    void generateXlsx_producesValidXlsxBytes() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "name"))
                .rows(List.of(Map.of("id", 1, "name", "Test")))
                .rowCount(1)
                .build();

        // Act
        ReportResultFileGenerator.GeneratedFile file = generator.generate(result, "XLSX", "Report");

        // Assert
        assertNotNull(file);
        assertEquals("Report.xlsx", file.filename());
        assertEquals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.contentType());
        assertTrue(file.data().length > 0);
        // XLSX files start with PK (ZIP format)
        assertEquals(0x50, file.data()[0] & 0xFF);
        assertEquals(0x4B, file.data()[1] & 0xFF);
    }

    @Test
    void generatePdf_fallsBackToCsv() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id"))
                .rows(List.of(Map.of("id", 42)))
                .rowCount(1)
                .build();

        // Act
        ReportResultFileGenerator.GeneratedFile file = generator.generate(result, "PDF", "test");

        // Assert - PDF currently falls back to CSV
        assertEquals("test.csv", file.filename());
        assertEquals("text/csv", file.contentType());
    }

    @Test
    void generate_defaultsToCsvForUnknownFormat() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("col"))
                .rows(List.of(Map.of("col", "val")))
                .rowCount(1)
                .build();

        // Act
        ReportResultFileGenerator.GeneratedFile file = generator.generate(result, "UNKNOWN", "test");

        // Assert
        assertEquals("test.csv", file.filename());
        assertEquals("text/csv", file.contentType());
    }

    @Test
    void generate_sanitizesReportNameForFilename() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id"))
                .rows(List.of(Map.of("id", 1)))
                .rowCount(1)
                .build();

        // Act
        ReportResultFileGenerator.GeneratedFile file = generator.generate(result, "CSV", "My Report/2024<test>");

        // Assert - special chars are removed
        assertFalse(file.filename().contains("/"));
        assertFalse(file.filename().contains("<"));
        assertFalse(file.filename().contains(">"));
    }
}
