package com.insighthub.job.handlers;

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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailAttachmentHandlerTest {

    @Mock
    private EmailSender emailSender;

    @Mock
    private SmtpServerService smtpServerService;

    @Mock
    private ReportResultFileGenerator fileGenerator;

    @InjectMocks
    private EmailAttachmentHandler handler;

    private JobEntity job;
    private JobExecutionEntity execution;
    private RunReportResult result;
    private SmtpServerEntity smtpServer;

    @BeforeEach
    void setUp() {
        ReportEntity report = ReportEntity.builder()
                .id(1L)
                .name("Sales Report")
                .active(true)
                .build();

        job = JobEntity.builder()
                .id(10L)
                .name("Daily Sales Email")
                .report(report)
                .outputFormat("CSV")
                .emailTo("user@example.com")
                .emailCc("cc@example.com")
                .emailBcc("bcc@example.com")
                .emailSubject("Daily Sales Report")
                .emailMessage("<p>Please find attached the daily sales report.</p>")
                .emailFrom("reports@company.com")
                .emailReplyTo("noreply@company.com")
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
    void handle_sendsEmailWithCsvAttachment() throws MessagingException {
        // Arrange
        job.setSmtpServer(smtpServer);

        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile(
                        "id,name,amount\r\n1,Item A,100.5\r\n".getBytes(),
                        "Sales_Report.csv",
                        "text/csv"
                );
        when(fileGenerator.generate(eq(result), eq("CSV"), eq("Sales Report")))
                .thenReturn(generatedFile);

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertEquals("Sales_Report.csv", handlerResult.outputFilePath());
        assertNotNull(handlerResult.message());

        // Verify email was sent with correct parameters
        ArgumentCaptor<List<EmailSender.Attachment>> attachCaptor = ArgumentCaptor.forClass(List.class);
        verify(emailSender).sendEmail(
                eq(smtpServer),
                eq("user@example.com"),
                eq("cc@example.com"),
                eq("bcc@example.com"),
                eq("Daily Sales Report"),
                eq("<p>Please find attached the daily sales report.</p>"),
                eq("reports@company.com"),
                eq("noreply@company.com"),
                attachCaptor.capture()
        );

        List<EmailSender.Attachment> attachments = attachCaptor.getValue();
        assertEquals(1, attachments.size());
        assertEquals("Sales_Report.csv", attachments.get(0).name());
        assertEquals("text/csv", attachments.get(0).contentType());
    }

    @Test
    void handle_usesJobSmtpServerWhenConfigured() throws MessagingException {
        // Arrange
        job.setSmtpServer(smtpServer);

        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile("data".getBytes(), "report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);

        // Act
        handler.handle(job, execution, result);

        // Assert - should use job's SMTP server, not call smtpServerService
        verify(smtpServerService, never()).getAllActive();
        verify(emailSender).sendEmail(eq(smtpServer), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void handle_fallsBackToFirstActiveSmtpServer() throws MessagingException {
        // Arrange - no SMTP server on job
        job.setSmtpServer(null);

        SmtpServerEntity fallbackSmtp = SmtpServerEntity.builder()
                .id(2L)
                .name("Fallback SMTP")
                .server("fallback.smtp.com")
                .active(true)
                .build();
        when(smtpServerService.getAllActive()).thenReturn(List.of(fallbackSmtp));

        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile("data".getBytes(), "report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        verify(smtpServerService).getAllActive();
        verify(emailSender).sendEmail(eq(fallbackSmtp), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void handle_failsWhenNoSmtpServerAvailable() {
        // Arrange
        job.setSmtpServer(null);
        when(smtpServerService.getAllActive()).thenReturn(List.of());

        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile("data".getBytes(), "report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertFalse(handlerResult.success());
        assertTrue(handlerResult.message().contains("No SMTP server available"));
    }

    @Test
    void handle_failsWhenEmailSendThrowsException() throws MessagingException {
        // Arrange
        job.setSmtpServer(smtpServer);

        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile("data".getBytes(), "report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);

        doThrow(new MessagingException("SMTP connection refused"))
                .when(emailSender).sendEmail(any(), any(), any(), any(), any(), any(), any(), any(), any());

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertFalse(handlerResult.success());
        assertTrue(handlerResult.message().contains("Email send failed"));
    }

    @Test
    void handle_defaultsToCsvWhenOutputFormatIsNull() throws MessagingException {
        // Arrange
        job.setOutputFormat(null);
        job.setSmtpServer(smtpServer);

        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile("data".getBytes(), "report.csv", "text/csv");
        when(fileGenerator.generate(eq(result), eq("CSV"), eq("Sales Report")))
                .thenReturn(generatedFile);

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        verify(fileGenerator).generate(result, "CSV", "Sales Report");
    }

    @Test
    void handle_skipsInactiveJobSmtpServerAndFallsBack() throws MessagingException {
        // Arrange - job has an SMTP server, but it's inactive
        SmtpServerEntity inactiveSmtp = SmtpServerEntity.builder()
                .id(3L)
                .name("Inactive SMTP")
                .active(false)
                .build();
        job.setSmtpServer(inactiveSmtp);

        SmtpServerEntity activeSmtp = SmtpServerEntity.builder()
                .id(4L)
                .name("Active Fallback")
                .active(true)
                .build();
        when(smtpServerService.getAllActive()).thenReturn(List.of(activeSmtp));

        ReportResultFileGenerator.GeneratedFile generatedFile =
                new ReportResultFileGenerator.GeneratedFile("data".getBytes(), "report.csv", "text/csv");
        when(fileGenerator.generate(any(), any(), any())).thenReturn(generatedFile);

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        verify(emailSender).sendEmail(eq(activeSmtp), any(), any(), any(), any(), any(), any(), any(), any());
    }
}
