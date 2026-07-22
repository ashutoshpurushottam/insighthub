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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConditionalPublishHandlerTest {

    @Mock
    private PublishHandler publishHandler;

    @InjectMocks
    private ConditionalPublishHandler handler;

    private JobEntity job;
    private JobExecutionEntity execution;

    @BeforeEach
    void setUp() {
        job = JobEntity.builder()
                .id(20L)
                .name("Conditional Publish Job")
                .jobType(JobType.CONDITIONAL_PUBLISH)
                .outputFormat("CSV")
                .build();

        execution = JobExecutionEntity.builder()
                .id(200L)
                .jobId(20L)
                .status("RUNNING")
                .build();
    }

    @Test
    void handle_skipsWhenRowCountIsZero() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "value"))
                .rows(List.of())
                .rowCount(0)
                .executionMs(30L)
                .build();

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertEquals("Skipped: no rows returned", handlerResult.message());
        assertNull(handlerResult.outputFilePath());
        verifyNoInteractions(publishHandler);
    }

    @Test
    void handle_skipsWhenRowsListIsEmpty() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "value"))
                .rows(List.of())
                .rowCount(0)
                .executionMs(30L)
                .build();

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertEquals("Skipped: no rows returned", handlerResult.message());
        verifyNoInteractions(publishHandler);
    }

    @Test
    void handle_delegatesToPublishHandlerWhenHasRows() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "value"))
                .rows(List.of(
                        Map.of("id", 1, "value", "data1"),
                        Map.of("id", 2, "value", "data2")
                ))
                .rowCount(2)
                .executionMs(100L)
                .build();

        JobHandlerResult delegateResult = JobHandlerResult.success("report.csv", "Published file 'report.csv'");
        when(publishHandler.handle(job, execution, result)).thenReturn(delegateResult);

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertTrue(handlerResult.success());
        assertEquals("report.csv", handlerResult.outputFilePath());
        assertEquals("Published file 'report.csv'", handlerResult.message());
        verify(publishHandler).handle(job, execution, result);
    }

    @Test
    void handle_propagatesDelegateFailure() {
        RunReportResult result = RunReportResult.builder()
                .columns(List.of("id", "value"))
                .rows(List.of(Map.of("id", 1, "value", "data")))
                .rowCount(1)
                .executionMs(50L)
                .build();

        JobHandlerResult delegateResult = JobHandlerResult.failure("Failed to write file");
        when(publishHandler.handle(job, execution, result)).thenReturn(delegateResult);

        JobHandlerResult handlerResult = handler.handle(job, execution, result);

        assertFalse(handlerResult.success());
        assertEquals("Failed to write file", handlerResult.message());
        verify(publishHandler).handle(job, execution, result);
    }
}
