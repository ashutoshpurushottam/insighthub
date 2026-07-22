package com.insighthub.job.handlers;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.JobType;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.report.RunReportResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConditionalEmailHandlerTest {

    @Mock
    private EmailAttachmentHandler emailAttachmentHandler;

    @Mock
    private EmailInlineHandler emailInlineHandler;

    @InjectMocks
    private ConditionalEmailHandler handler;

    private JobEntity job;
    private JobExecutionEntity execution;

    @BeforeEach
    void setUp() {
        job = JobEntity.builder()
                .id(10L)
                .name("Conditional Email Job")
                .jobType(JobType.CONDITIONAL_EMAIL_ATTACHMENT)
                .emailTo("user@example.com")
                .emailSubject("Report")
                .build();

        execution = JobExecutionEntity.builder()
                .id(100L)
                .jobId(10L)
                .status("RUNNING")
                .build();
    }

    @Test
    void handle_skipsWhenRowCountIsZero() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "name"))
                .rows(List.of())
                .rowCount(0)
                .executionMs(50L)
                .build();

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertEquals("Skipped: no rows returned", handlerResult.message());
        assertNull(handlerResult.outputFilePath());
        verifyNoInteractions(emailAttachmentHandler);
        verifyNoInteractions(emailInlineHandler);
    }

    @Test
    void handle_skipsWhenRowsListIsEmpty() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "name"))
                .rows(List.of())
                .rowCount(0)
                .executionMs(50L)
                .build();

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertEquals("Skipped: no rows returned", handlerResult.message());
        verifyNoInteractions(emailAttachmentHandler);
        verifyNoInteractions(emailInlineHandler);
    }

    @Test
    void handle_delegatesToEmailAttachmentHandlerWhenHasRows() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "name"))
                .rows(List.of(Map.of("id", 1, "name", "Test")))
                .rowCount(1)
                .executionMs(50L)
                .build();

        job.setJobType(JobType.CONDITIONAL_EMAIL_ATTACHMENT);

        JobHandlerResult delegateResult = JobHandlerResult.success("report.csv", "Email sent");
        when(emailAttachmentHandler.handle(job, execution, result)).thenReturn(delegateResult);

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertEquals("Email sent", handlerResult.message());
        verify(emailAttachmentHandler).handle(job, execution, result);
        verifyNoInteractions(emailInlineHandler);
    }

    @Test
    void handle_delegatesToEmailInlineHandlerForConditionalInlineType() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "name"))
                .rows(List.of(Map.of("id", 1, "name", "Test")))
                .rowCount(1)
                .executionMs(50L)
                .build();

        job.setJobType(JobType.CONDITIONAL_EMAIL_INLINE);

        JobHandlerResult delegateResult = JobHandlerResult.success("Inline email sent");
        when(emailInlineHandler.handle(job, execution, result)).thenReturn(delegateResult);

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertEquals("Inline email sent", handlerResult.message());
        verify(emailInlineHandler).handle(job, execution, result);
        verifyNoInteractions(emailAttachmentHandler);
    }

    @Test
    void handle_propagatesDelegateFailure() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "name"))
                .rows(List.of(Map.of("id", 1, "name", "Test")))
                .rowCount(1)
                .executionMs(50L)
                .build();

        job.setJobType(JobType.CONDITIONAL_EMAIL_ATTACHMENT);

        JobHandlerResult delegateResult = JobHandlerResult.failure("No SMTP server available");
        when(emailAttachmentHandler.handle(job, execution, result)).thenReturn(delegateResult);

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertFalse(handlerResult.success());
        assertEquals("No SMTP server available", handlerResult.message());
    }
}
