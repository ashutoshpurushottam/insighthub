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
class EmailInlineHandlerTest {

    @Mock
    private EmailSender emailSender;

    @Mock
    private SmtpServerService smtpServerService;

    @InjectMocks
    private EmailInlineHandler handler;

    private JobEntity testJob;
    private JobExecutionEntity testExecution;
    private SmtpServerEntity testSmtp;
    private RunReportResult testResult;

    @BeforeEach
    void setUp() {
        testSmtp = SmtpServerEntity.builder()
                .id(1L)
                .name("Test SMTP")
                .server("smtp.example.com")
                .port(587)
                .active(true)
                .fromAddress("noreply@example.com")
                .build();

        testJob = JobEntity.builder()
                .id(10L)
                .name("Inline Report Job")
                .emailTo("user@example.com")
                .emailCc("cc@example.com")
                .emailBcc("bcc@example.com")
                .emailSubject("Daily Report")
                .emailMessage("Here is your report:")
                .emailFrom("reports@example.com")
                .emailReplyTo("reply@example.com")
                .smtpServer(testSmtp)
                .build();

        testExecution = JobExecutionEntity.builder()
                .id(100L)
                .jobId(10L)
                .status("RUNNING")
                .build();

        testResult = RunReportResult.builder()
                .columns(List.of("Name", "Sales", "Region"))
                .rows(List.of(
                        Map.of("Name", "Alice", "Sales", 1500, "Region", "North"),
                        Map.of("Name", "Bob", "Sales", 2300, "Region", "South")
                ))
                .rowCount(2)
                .executionMs(100)
                .build();
    }

    @Test
    void handle_success_sendsEmailWithHtmlTable() throws MessagingException {
        JobHandlerResult result = handler.handle(testJob, testExecution, testResult);

        assertTrue(result.success());
        assertNull(result.outputFilePath());
        assertTrue(result.message().contains("Inline email sent"));

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSender).sendEmail(
                eq(testSmtp),
                eq("user@example.com"),
                eq("cc@example.com"),
                eq("bcc@example.com"),
                eq("Daily Report"),
                bodyCaptor.capture(),
                eq("reports@example.com"),
                eq("reply@example.com"),
                eq(List.of())
        );

        String body = bodyCaptor.getValue();
        // Verify HTML table structure
        assertTrue(body.contains("<table"));
        assertTrue(body.contains("<thead>"));
        assertTrue(body.contains("<tbody>"));
        assertTrue(body.contains("Name"));
        assertTrue(body.contains("Sales"));
        assertTrue(body.contains("Region"));
        assertTrue(body.contains("Alice"));
        assertTrue(body.contains("1500"));
        assertTrue(body.contains("Bob"));
    }

    @Test
    void handle_prependsEmailMessage_beforeTable() throws MessagingException {
        JobHandlerResult result = handler.handle(testJob, testExecution, testResult);

        assertTrue(result.success());

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSender).sendEmail(any(), any(), any(), any(), any(), bodyCaptor.capture(), any(), any(), any());

        String body = bodyCaptor.getValue();
        int messageIndex = body.indexOf("Here is your report:");
        int tableIndex = body.indexOf("<table");
        assertTrue(messageIndex < tableIndex, "Email message should appear before the table");
    }

    @Test
    void handle_noEmailMessage_onlyRendersTable() throws MessagingException {
        testJob.setEmailMessage(null);

        JobHandlerResult result = handler.handle(testJob, testExecution, testResult);

        assertTrue(result.success());

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSender).sendEmail(any(), any(), any(), any(), any(), bodyCaptor.capture(), any(), any(), any());

        String body = bodyCaptor.getValue();
        assertTrue(body.startsWith("<table"));
    }

    @Test
    void handle_emptyEmailMessage_onlyRendersTable() throws MessagingException {
        testJob.setEmailMessage("   ");

        JobHandlerResult result = handler.handle(testJob, testExecution, testResult);

        assertTrue(result.success());

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSender).sendEmail(any(), any(), any(), any(), any(), bodyCaptor.capture(), any(), any(), any());

        String body = bodyCaptor.getValue();
        assertTrue(body.startsWith("<table"));
    }

    @Test
    void handle_noSmtpServer_fallsBackToFirstActive() throws MessagingException {
        testJob.setSmtpServer(null);
        when(smtpServerService.getAllActive()).thenReturn(List.of(testSmtp));

        JobHandlerResult result = handler.handle(testJob, testExecution, testResult);

        assertTrue(result.success());
        verify(emailSender).sendEmail(eq(testSmtp), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void handle_noSmtpAvailable_returnsFailure() {
        testJob.setSmtpServer(null);
        when(smtpServerService.getAllActive()).thenReturn(List.of());

        JobHandlerResult result = handler.handle(testJob, testExecution, testResult);

        assertFalse(result.success());
        assertTrue(result.message().contains("No SMTP server available"));
        verifyNoInteractions(emailSender);
    }

    @Test
    void handle_inactiveJobSmtp_fallsBackToFirstActive() throws MessagingException {
        SmtpServerEntity inactiveSmtp = SmtpServerEntity.builder()
                .id(2L)
                .name("Inactive SMTP")
                .active(false)
                .build();
        testJob.setSmtpServer(inactiveSmtp);
        when(smtpServerService.getAllActive()).thenReturn(List.of(testSmtp));

        JobHandlerResult result = handler.handle(testJob, testExecution, testResult);

        assertTrue(result.success());
        verify(emailSender).sendEmail(eq(testSmtp), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void handle_emailSenderThrowsException_returnsFailure() throws MessagingException {
        doThrow(new MessagingException("Connection refused"))
                .when(emailSender).sendEmail(any(), any(), any(), any(), any(), any(), any(), any(), any());

        JobHandlerResult result = handler.handle(testJob, testExecution, testResult);

        assertFalse(result.success());
        assertTrue(result.message().contains("Failed to send inline email"));
        assertTrue(result.message().contains("Connection refused"));
    }

    @Test
    void handle_emptyResult_rendersTableWithHeadersOnly() throws MessagingException {
        RunReportResult emptyResult = RunReportResult.builder()
                .columns(List.of("Name", "Value"))
                .rows(List.of())
                .rowCount(0)
                .executionMs(10)
                .build();

        JobHandlerResult result = handler.handle(testJob, testExecution, emptyResult);

        assertTrue(result.success());

        ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSender).sendEmail(any(), any(), any(), any(), any(), bodyCaptor.capture(), any(), any(), any());

        String body = bodyCaptor.getValue();
        assertTrue(body.contains("<thead>"));
        assertTrue(body.contains("Name"));
        assertTrue(body.contains("Value"));
        assertTrue(body.contains("<tbody></tbody>"));
    }

    @Test
    void renderHtmlTable_escapesHtmlInValues() {
        RunReportResult resultWithHtml = RunReportResult.builder()
                .columns(List.of("Name"))
                .rows(List.of(Map.of("Name", "<script>alert('xss')</script>")))
                .rowCount(1)
                .executionMs(10)
                .build();

        String html = handler.renderHtmlTable(resultWithHtml);

        assertFalse(html.contains("<script>"));
        assertTrue(html.contains("&lt;script&gt;"));
    }

    @Test
    void renderHtmlTable_handlesNullValues() {
        RunReportResult resultWithNulls = RunReportResult.builder()
                .columns(List.of("Name", "Value"))
                .rows(List.of(Map.of("Name", "Test")))  // "Value" key missing → null
                .rowCount(1)
                .executionMs(10)
                .build();

        String html = handler.renderHtmlTable(resultWithNulls);

        assertTrue(html.contains("Test"));
        // The null value cell should be empty, not "null"
        assertTrue(html.contains("<td style=\"border: 1px solid #ddd; padding: 8px 12px;\"></td>"));
    }

    @Test
    void buildEmailBody_multilineMessage_convertsNewlinesToBr() {
        String htmlTable = "<table><tr><td>data</td></tr></table>";
        String body = handler.buildEmailBody("Line 1\nLine 2\nLine 3", htmlTable);

        assertTrue(body.contains("Line 1<br/>Line 2<br/>Line 3"));
    }
}
