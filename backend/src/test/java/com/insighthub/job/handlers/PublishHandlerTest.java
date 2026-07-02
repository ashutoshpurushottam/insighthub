package com.insighthub.job.handlers;

import com.insighthub.job.JobArchiveEntity;
import com.insighthub.job.JobArchiveRepository;
import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.RunReportResult;
import com.insighthub.smtp.EmailSender;
import com.insighthub.smtp.SmtpServerEntity;
import com.insighthub.smtp.SmtpServerService;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublishHandlerTest {

    @Mock
    private ReportResultFileGenerator fileGenerator;

    @Mock
    private JobArchiveRepository jobArchiveRepository;

    @Mock
    private EmailSender emailSender;

    @Mock
    private SmtpServerService smtpServerService;

    private PublishHandler handler;

    @TempDir
    Path tempDir;

    private JobEntity job;
    private JobExecutionEntity execution;
    private RunReportResult result;
    private SmtpServerEntity smtpServer;

    @BeforeEach
    void setUp() {
        handler = new PublishHandler(fileGenerator, jobArchiveRepository, emailSender, smtpServerService, tempDir.toString());

        ReportEntity report = ReportEntity.builder()
                .id(1L)
                .name("Sales Report")
                .active(true)
                .build();

        job = JobEntity.builder()
                .id(10L)
                .name("Daily Sales Publish")
                .report(report)
                .outputFormat("CSV")
                .runsToArchive(3)
                .build();

        execution = JobExecutionEntity.builder()
                .id(100L)
                .jobId(10L)
                .status("RUNNING")
                .build();

        result = RunReportResult.builder()
                .columns(List.of("id", "name", "amount"))
                .rows(List.of(
                        Map.of("id", 1, "name", "Item A", "amount", 100.50),
                        Map.of("id", 2, "name", "Item B", "amount", 200.75)
                ))
                .rowCount(2)
                .executionMs(150L)
                .build();

        smtpServer = SmtpServerEntity.builder()
                .id(1L)
                .name("Default SMTP")
                .server("smtp.company.com")
                .port(587)
                .active(true)
                .build();
    }

    @Test
    void handle_publishesFileToExportDirectory() {
        // Arrange
        byte[] fileBytes = "id,name,amount\r\n1,Item A,100.5\r\n".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(eq(result), eq("CSV"), eq("Sales Report")))
                .thenReturn(generatedFile);
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>());

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertNotNull(handlerResult.outputFilePath());
        assertTrue(handlerResult.outputFilePath().contains("Sales_Report.csv"));

        // Verify file was written to disk
        Path expectedFile = tempDir.resolve("Sales_Report.csv");
        assertTrue(Files.exists(expectedFile));
    }

    @Test
    void handle_usesFixedFileNameWhenConfigured() {
        // Arrange
        job.setFixedFileName("monthly_sales.csv");

        byte[] fileBytes = "data".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>());

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.outputFilePath().contains("monthly_sales.csv"));

        Path expectedFile = tempDir.resolve("monthly_sales.csv");
        assertTrue(Files.exists(expectedFile));
    }

    @Test
    void handle_usesSubDirectoryWhenConfigured() {
        // Arrange
        job.setSubDirectory("reports/sales");

        byte[] fileBytes = "data".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>());

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());

        Path expectedFile = tempDir.resolve("reports/sales/Sales_Report.csv");
        assertTrue(Files.exists(expectedFile));
    }

    @Test
    void handle_createsArchiveRecord() {
        // Arrange
        byte[] fileBytes = "data content".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>());

        // Act
        handler.handle(job, execution, result);

        // Assert
        ArgumentCaptor<JobArchiveEntity> archiveCaptor = ArgumentCaptor.forClass(JobArchiveEntity.class);
        verify(jobArchiveRepository).save(archiveCaptor.capture());

        JobArchiveEntity savedArchive = archiveCaptor.getValue();
        assertEquals(10L, savedArchive.getJobId());
        assertEquals(100L, savedArchive.getExecutionId());
        assertEquals("Sales_Report.csv", savedArchive.getFileName());
        assertEquals((long) fileBytes.length, savedArchive.getFileSize());
        assertTrue(savedArchive.getFilePath().contains("Sales_Report.csv"));
    }

    @Test
    void handle_prunesOldArchivesWhenExceedingLimit() throws IOException {
        // Arrange
        job.setRunsToArchive(2);

        byte[] fileBytes = "data".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);

        // Create old archive files on disk
        Path oldFile1 = tempDir.resolve("old_file_1.csv");
        Path oldFile2 = tempDir.resolve("old_file_2.csv");
        Files.writeString(oldFile1, "old data 1");
        Files.writeString(oldFile2, "old data 2");

        // Simulate 3 existing archives (after saving the new one, there will be 4 total)
        // The repository returns them in createdAt DESC order
        List<JobArchiveEntity> existingArchives = new ArrayList<>(List.of(
                JobArchiveEntity.builder().id(4L).jobId(10L).filePath(tempDir.resolve("Sales_Report.csv").toString()).fileName("Sales_Report.csv").build(),
                JobArchiveEntity.builder().id(3L).jobId(10L).filePath("keep_this.csv").fileName("keep_this.csv").build(),
                JobArchiveEntity.builder().id(2L).jobId(10L).filePath(oldFile1.toString()).fileName("old_file_1.csv").build(),
                JobArchiveEntity.builder().id(1L).jobId(10L).filePath(oldFile2.toString()).fileName("old_file_2.csv").build()
        ));
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(existingArchives);

        // Act
        handler.handle(job, execution, result);

        // Assert — archives beyond limit should be deleted
        verify(jobArchiveRepository, times(2)).delete(any(JobArchiveEntity.class));

        // Old files should be removed from disk
        assertFalse(Files.exists(oldFile1));
        assertFalse(Files.exists(oldFile2));
    }

    @Test
    void handle_doesNotPruneWhenRunsToArchiveIsZero() {
        // Arrange
        job.setRunsToArchive(0);

        byte[] fileBytes = "data".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);

        // Act
        handler.handle(job, execution, result);

        // Assert — no pruning should happen (findByJobId never called for pruning)
        verify(jobArchiveRepository, never()).findByJobIdOrderByCreatedAtDesc(anyLong());
        verify(jobArchiveRepository, never()).delete(any(JobArchiveEntity.class));
    }

    @Test
    void handle_sendsNotificationEmailWhenToIsConfigured() throws MessagingException {
        // Arrange
        job.setEmailTo("recipient@example.com");
        job.setEmailSubject("Report Ready");
        job.setEmailMessage("<p>Your report is ready.</p>");
        job.setSmtpServer(smtpServer);

        byte[] fileBytes = "data".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>());

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        verify(emailSender).sendEmail(
                eq(smtpServer),
                eq("recipient@example.com"),
                isNull(),
                isNull(),
                eq("Report Ready"),
                eq("<p>Your report is ready.</p>"),
                isNull(),
                isNull(),
                eq(Collections.emptyList())
        );
    }

    @Test
    void handle_doesNotSendEmailWhenToIsNotConfigured() throws MessagingException {
        // Arrange — no emailTo set
        job.setEmailTo(null);

        byte[] fileBytes = "data".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>());

        // Act
        handler.handle(job, execution, result);

        // Assert — no email should be sent
        verify(emailSender, never()).sendEmail(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void handle_succeedsEvenWhenNotificationEmailFails() throws MessagingException {
        // Arrange
        job.setEmailTo("recipient@example.com");
        job.setSmtpServer(smtpServer);

        byte[] fileBytes = "data".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>());

        doThrow(new MessagingException("SMTP down"))
                .when(emailSender).sendEmail(any(), any(), any(), any(), any(), any(), any(), any(), any());

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert — publish still succeeds even if notification fails
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.outputFilePath().contains("Sales_Report.csv"));
    }

    @Test
    void handle_defaultsToCsvWhenOutputFormatIsNull() {
        // Arrange
        job.setOutputFormat(null);

        byte[] fileBytes = "data".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(eq(result), eq("CSV"), eq("Sales Report")))
                .thenReturn(generatedFile);
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>());

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        verify(fileGenerator).generate(result, "CSV", "Sales Report");
    }

    @Test
    void handle_usesDefaultSubjectWhenNotConfigured() throws MessagingException {
        // Arrange
        job.setEmailTo("user@example.com");
        job.setEmailSubject(null);
        job.setEmailMessage(null);
        job.setSmtpServer(smtpServer);

        byte[] fileBytes = "data".getBytes();
        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(fileBytes, "Sales_Report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);
        when(jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>());

        // Act
        handler.handle(job, execution, result);

        // Assert — default subject should be used
        ArgumentCaptor<String> subjectCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSender).sendEmail(any(), any(), any(), any(), subjectCaptor.capture(), any(), any(), any(), any());

        String subject = subjectCaptor.getValue();
        assertEquals("Report Published: Daily Sales Publish", subject);
    }

    @Test
    void handle_failsWhenFileGeneratorThrowsException() {
        // Arrange — file generator throws an exception
        when(fileGenerator.generate(any(), any(), any()))
                .thenThrow(new RuntimeException("File generation failed"));

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertFalse(handlerResult.success());
        assertTrue(handlerResult.message().contains("File generation failed"),
                "Expected failure message but got: " + handlerResult.message());
    }
}
