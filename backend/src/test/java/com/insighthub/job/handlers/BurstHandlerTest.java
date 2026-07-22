package com.insighthub.job.handlers;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.RunReportResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BurstHandlerTest {

    @Mock
    private ReportResultFileGenerator fileGenerator;

    private BurstHandler handler;

    private JobEntity job;
    private JobExecutionEntity execution;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        handler = new BurstHandler(fileGenerator);
        ReflectionTestUtils.setField(handler, "exportDirectory", tempDir.toString());

        ReportEntity report = ReportEntity.builder()
                .id(1L)
                .name("Sales Report")
                .active(true)
                .build();

        job = JobEntity.builder()
                .id(10L)
                .name("Daily Burst Job")
                .report(report)
                .outputFormat("CSV")
                .subDirectory("burst_output")
                .build();

        execution = JobExecutionEntity.builder()
                .id(100L)
                .jobId(10L)
                .status("RUNNING")
                .build();
    }

    @Test
    void handle_emptyResult_returnsSuccessNoRows() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("region", "sales"))
                .rows(List.of())
                .rowCount(0)
                .executionMs(50L)
                .build();

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("no rows"));
        verifyNoInteractions(fileGenerator);
    }

    @Test
    void handle_nullRows_returnsSuccessNoRows() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("region", "sales"))
                .rows(null)
                .rowCount(0)
                .executionMs(50L)
                .build();

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("no rows"));
    }

    @Test
    void handle_noColumns_returnsFailure() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of())
                .rows(List.of(Map.of("a", 1)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertFalse(handlerResult.success());
        assertTrue(handlerResult.message().contains("no columns"));
    }

    @Test
    void handle_singleBurstValue_generatesOneFile() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("region", "product", "amount"))
                .rows(List.of(
                        Map.of("region", "East", "product", "Widget", "amount", 100),
                        Map.of("region", "East", "product", "Gadget", "amount", 200)
                ))
                .rowCount(2)
                .executionMs(100L)
                .build();

        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_East")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "region,product,amount\r\nEast,Widget,100\r\nEast,Gadget,200\r\n".getBytes(),
                        "Sales_Report_East.csv",
                        "text/csv"
                ));

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("1 files generated"));
        verify(fileGenerator, times(1)).generate(any(), any(), any());
    }

    @Test
    void handle_multipleBurstValues_generatesMultipleFiles() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("region", "product", "amount"))
                .rows(List.of(
                        Map.of("region", "East", "product", "Widget", "amount", 100),
                        Map.of("region", "East", "product", "Gadget", "amount", 200),
                        Map.of("region", "West", "product", "Widget", "amount", 150),
                        Map.of("region", "West", "product", "Gadget", "amount", 250),
                        Map.of("region", "North", "product", "Widget", "amount", 50)
                ))
                .rowCount(5)
                .executionMs(100L)
                .build();

        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_East")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "data".getBytes(), "Sales_Report_East.csv", "text/csv"));
        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_West")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "data".getBytes(), "Sales_Report_West.csv", "text/csv"));
        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_North")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "data".getBytes(), "Sales_Report_North.csv", "text/csv"));

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("3 files generated"));
        verify(fileGenerator, times(3)).generate(any(), any(), any());
    }

    @Test
    void handle_nullBurstValue_usesNullInFilename() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("region", "amount"))
                .rows(List.of(
                        Map.of("amount", 100),  // region is null (missing key)
                        Map.of("amount", 200)
                ))
                .rowCount(2)
                .executionMs(50L)
                .build();

        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_null")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "data".getBytes(), "Sales_Report_null.csv", "text/csv"));

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("1 files generated"));
    }

    @Test
    void handle_writesFilesToOutputDirectory() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("dept", "employee"))
                .rows(List.of(
                        Map.of("dept", "Engineering", "employee", "Alice"),
                        Map.of("dept", "Sales", "employee", "Bob")
                ))
                .rowCount(2)
                .executionMs(50L)
                .build();

        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_Engineering")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "engineering data".getBytes(), "Sales_Report_Engineering.csv", "text/csv"));
        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_Sales")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "sales data".getBytes(), "Sales_Report_Sales.csv", "text/csv"));

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());

        // Verify files were written to the correct directory
        Path outputDir = tempDir.resolve("burst_output");
        assertTrue(Files.exists(outputDir.resolve("Sales_Report_Engineering.csv")));
        assertTrue(Files.exists(outputDir.resolve("Sales_Report_Sales.csv")));
    }

    @Test
    void handle_noSubDirectory_writesDirectlyToExportDir() {
        job.setSubDirectory(null);

        RunReportResult result = RunReportResult.builder()
                .columns(List.of("region", "amount"))
                .rows(List.of(Map.of("region", "East", "amount", 100)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_East")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "data".getBytes(), "Sales_Report_East.csv", "text/csv"));

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertTrue(Files.exists(tempDir.resolve("Sales_Report_East.csv")));
    }

    @Test
    void handle_defaultsFormatToCsvWhenNull() {
        job.setOutputFormat(null);

        RunReportResult result = RunReportResult.builder()
                .columns(List.of("region", "amount"))
                .rows(List.of(Map.of("region", "East", "amount", 100)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_East")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "data".getBytes(), "Sales_Report_East.csv", "text/csv"));

        handler.handle(job, execution, result);

        verify(fileGenerator).generate(any(), eq("CSV"), any());
    }

    @Test
    void handle_returnsOutputDirPathOnSuccess() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("region", "amount"))
                .rows(List.of(Map.of("region", "East", "amount", 100)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), eq("Sales Report_East")))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "data".getBytes(), "Sales_Report_East.csv", "text/csv"));

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertNotNull(handlerResult.outputFilePath());
        assertTrue(handlerResult.outputFilePath().contains("burst_output"));
    }

    @Test
    void handle_specialCharactersInBurstValue_sanitized() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("dept", "amount"))
                .rows(List.of(Map.of("dept", "R&D / Special", "amount", 100)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        // The burst value "R&D / Special" should be sanitized to "R_D___Special"
        when(fileGenerator.generate(any(RunReportResult.class), eq("CSV"), argThat(name -> name.contains("R_D"))))
                .thenReturn(new ReportResultFileGenerator.GeneratedFile(
                        "data".getBytes(), "Sales_Report_R_D___Special.csv", "text/csv"));

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
    }
}
