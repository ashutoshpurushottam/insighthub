package com.insighthub.job.handlers;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.report.RunReportResult;
import com.insighthub.smtp.EmailSender;
import com.insighthub.smtp.SmtpServerEntity;
import com.insighthub.smtp.SmtpServerService;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertHandlerTest {

    @Mock
    private EmailSender emailSender;

    @Mock
    private SmtpServerService smtpServerService;

    @InjectMocks
    private AlertHandler handler;

    private JobEntity job;
    private JobExecutionEntity execution;
    private SmtpServerEntity smtpServer;

    @BeforeEach
    void setUp() {
        job = JobEntity.builder()
                .id(10L)
                .name("Alert Job")
                .emailTo("alert@example.com")
                .emailSubject("Alert: Threshold Exceeded")
                .emailMessage("The monitored value has exceeded the threshold.")
                .build();

        execution = JobExecutionEntity.builder()
                .id(100L)
                .jobId(10L)
                .status("RUNNING")
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
    void handle_noRows_returnsSuccessNoAlert() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(List.of())
                .rowCount(0)
                .executionMs(50L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("No rows returned"));
        verifyNoInteractions(emailSender);
    }

    @Test
    void handle_nullRows_returnsSuccessNoAlert() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(null)
                .rowCount(0)
                .executionMs(50L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        verifyNoInteractions(emailSender);
    }

    @Test
    void handle_valueGreaterThanZero_sendsAlert() throws MessagingException {
        // Arrange
        job.setSmtpServer(smtpServer);

        RunReportResult result = RunReportResult.builder()
                .columns(List.of("alert_count"))
                .rows(List.of(Map.of("alert_count", 5)))
                .rowCount(1)
                .executionMs(100L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("Alert triggered"));

        verify(emailSender).sendEmail(
                eq(smtpServer),
                eq("alert@example.com"),
                isNull(),
                isNull(),
                eq("Alert: Threshold Exceeded"),
                eq("The monitored value has exceeded the threshold."),
                isNull(),
                isNull(),
                eq(List.of())
        );
    }

    @Test
    void handle_valueZero_noAlert() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(List.of(Map.of("count", 0)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("not triggered"));
        verifyNoInteractions(emailSender);
    }

    @Test
    void handle_negativeValue_noAlert() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(List.of(Map.of("count", -3)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("not triggered"));
        verifyNoInteractions(emailSender);
    }

    @Test
    void handle_nullFirstColumnValue_noAlert() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(List.of(new java.util.HashMap<>(Map.of("other", "val"))))
                .rowCount(1)
                .executionMs(50L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("null"));
        verifyNoInteractions(emailSender);
    }

    @Test
    void handle_doubleValueGreaterThanZero_sendsAlert() throws MessagingException {
        // Arrange
        job.setSmtpServer(smtpServer);

        RunReportResult result = RunReportResult.builder()
                .columns(List.of("ratio"))
                .rows(List.of(Map.of("ratio", 0.5)))
                .rowCount(1)
                .executionMs(100L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("Alert triggered"));
        verify(emailSender).sendEmail(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void handle_stringNumericValue_sendsAlert() throws MessagingException {
        // Arrange
        job.setSmtpServer(smtpServer);

        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(List.of(Map.of("count", "42")))
                .rowCount(1)
                .executionMs(100L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("Alert triggered"));
        verify(emailSender).sendEmail(any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void handle_nonNumericValue_noAlert() {
        // Arrange
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("status"))
                .rows(List.of(Map.of("status", "active")))
                .rowCount(1)
                .executionMs(50L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        assertTrue(handlerResult.message().contains("not numeric"));
        verifyNoInteractions(emailSender);
    }

    @Test
    void handle_noSmtpServer_returnsFailure() {
        // Arrange
        job.setSmtpServer(null);
        when(smtpServerService.getAllActive()).thenReturn(List.of());

        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(List.of(Map.of("count", 10)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertFalse(handlerResult.success());
        assertTrue(handlerResult.message().contains("No SMTP server available"));
    }

    @Test
    void handle_emailSendingFails_returnsFailure() throws MessagingException {
        // Arrange
        job.setSmtpServer(smtpServer);

        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(List.of(Map.of("count", 5)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        doThrow(new MessagingException("Connection refused"))
                .when(emailSender).sendEmail(any(), any(), any(), any(), any(), any(), any(), any(), any());

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertFalse(handlerResult.success());
        assertTrue(handlerResult.message().contains("Alert email send failed"));
    }

    @Test
    void handle_fallsBackToFirstActiveSmtpServer() throws MessagingException {
        // Arrange - no SMTP on job
        job.setSmtpServer(null);

        SmtpServerEntity fallbackSmtp = SmtpServerEntity.builder()
                .id(2L)
                .name("Fallback SMTP")
                .server("fallback.smtp.com")
                .active(true)
                .build();
        when(smtpServerService.getAllActive()).thenReturn(List.of(fallbackSmtp));

        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(List.of(Map.of("count", 1)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        verify(emailSender).sendEmail(eq(fallbackSmtp), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void handle_inactiveJobSmtpServer_fallsBackToActive() throws MessagingException {
        // Arrange
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

        RunReportResult result = RunReportResult.builder()
                .columns(List.of("count"))
                .rows(List.of(Map.of("count", 7)))
                .rowCount(1)
                .executionMs(50L)
                .build();

        // Act
        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        // Assert
        assertTrue(handlerResult.success());
        verify(emailSender).sendEmail(eq(activeSmtp), any(), any(), any(), any(), any(), any(), any(), any());
    }
}
