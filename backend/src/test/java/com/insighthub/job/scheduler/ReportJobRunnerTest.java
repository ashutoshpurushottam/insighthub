package com.insighthub.job.scheduler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.JobExecutionRepository;
import com.insighthub.job.JobRepository;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.ReportRunService;
import com.insighthub.report.RunReportResult;
import com.insighthub.smtp.EmailSender;
import com.insighthub.smtp.SmtpServerEntity;
import com.insighthub.smtp.SmtpServerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.JobDataMap;
import org.quartz.JobDetail;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportJobRunnerTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private JobExecutionRepository jobExecutionRepository;

    @Mock
    private ReportRunService reportRunService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private EmailSender emailSender;

    @Mock
    private SmtpServerService smtpServerService;

    @Mock
    private JobExecutionContext context;

    @Mock
    private JobDetail jobDetail;

    @InjectMocks
    private ReportJobRunner reportJobRunner;

    private JobEntity testJob;
    private ReportEntity testReport;

    @BeforeEach
    void setUp() {
        testReport = new ReportEntity();
        testReport.setId(100L);
        testReport.setName("Monthly Sales Report");
        testReport.setActive(true);

        testJob = JobEntity.builder()
                .id(42L)
                .name("Daily Sales Job")
                .active(true)
                .report(testReport)
                .parameterValues(null)
                .build();

        JobDataMap dataMap = new JobDataMap();
        dataMap.putAsString("jobId", 42L);

        lenient().when(context.getJobDetail()).thenReturn(jobDetail);
        lenient().when(jobDetail.getJobDataMap()).thenReturn(dataMap);
    }

    @Test
    void execute_successfulExecution_updatesStatusToSuccess() throws JobExecutionException {
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));

        // Track statuses at each save call (since the same entity is mutated)
        java.util.List<String> statusesAtSave = new java.util.ArrayList<>();
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    statusesAtSave.add(entity.getStatus());
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(25)
                        .executionMs(500)
                        .columns(List.of("col1"))
                        .rows(List.of())
                        .build());

        reportJobRunner.execute(context);

        verify(jobExecutionRepository, times(2)).save(any(JobExecutionEntity.class));

        // First save was RUNNING, second was SUCCESS
        assertEquals("RUNNING", statusesAtSave.get(0));
        assertEquals("SUCCESS", statusesAtSave.get(1));

        // Verify final state of the entity
        ArgumentCaptor<JobExecutionEntity> executionCaptor = ArgumentCaptor.forClass(JobExecutionEntity.class);
        verify(jobExecutionRepository, times(2)).save(executionCaptor.capture());
        JobExecutionEntity finalExecution = executionCaptor.getAllValues().get(1);
        assertEquals(42L, finalExecution.getJobId());
        assertNotNull(finalExecution.getEndTime());
        assertEquals(25L, finalExecution.getRowsGenerated());
    }

    @Test
    void execute_jobNotFound_throwsJobExecutionException() {
        when(jobRepository.findById(42L)).thenReturn(Optional.empty());

        JobExecutionException ex = assertThrows(JobExecutionException.class,
                () -> reportJobRunner.execute(context));

        assertTrue(ex.getMessage().contains("Job not found"));
        verifyNoInteractions(jobExecutionRepository);
    }

    @Test
    void execute_jobInactive_skipsExecution() throws JobExecutionException {
        testJob.setActive(false);
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));

        reportJobRunner.execute(context);

        verifyNoInteractions(jobExecutionRepository);
        verifyNoInteractions(reportRunService);
    }

    @Test
    void execute_reportInactive_skipsExecution() throws JobExecutionException {
        testReport.setActive(false);
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));

        reportJobRunner.execute(context);

        verifyNoInteractions(jobExecutionRepository);
        verifyNoInteractions(reportRunService);
    }

    @Test
    void execute_jobHasNoReport_throwsJobExecutionException() {
        testJob.setReport(null);
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));

        JobExecutionException ex = assertThrows(JobExecutionException.class,
                () -> reportJobRunner.execute(context));

        assertTrue(ex.getMessage().contains("no report assigned"));
    }

    @Test
    void execute_reportExecutionFails_updatesStatusToFailed() throws JobExecutionException {
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenThrow(new RuntimeException("Database connection timeout"));

        reportJobRunner.execute(context);

        ArgumentCaptor<JobExecutionEntity> executionCaptor = ArgumentCaptor.forClass(JobExecutionEntity.class);
        verify(jobExecutionRepository, times(2)).save(executionCaptor.capture());

        List<JobExecutionEntity> savedExecutions = executionCaptor.getAllValues();

        // Second save: FAILED
        assertEquals("FAILED", savedExecutions.get(1).getStatus());
        assertNotNull(savedExecutions.get(1).getEndTime());
        assertEquals("Database connection timeout", savedExecutions.get(1).getErrorMessage());
    }

    @Test
    void execute_withParameterValues_passesParamsToReportService() throws JobExecutionException {
        testJob.setParameterValues("{\"startDate\":\"2025-01-01\",\"endDate\":\"2025-01-31\"}");
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(10)
                        .executionMs(200)
                        .columns(List.of("col1"))
                        .rows(List.of())
                        .build());

        reportJobRunner.execute(context);

        ArgumentCaptor<Map<String, String>> paramsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(reportRunService).runReport(eq(100L), paramsCaptor.capture());

        Map<String, String> params = paramsCaptor.getValue();
        assertEquals("2025-01-01", params.get("startDate"));
        assertEquals("2025-01-31", params.get("endDate"));
    }

    @Test
    void execute_onFailure_sendsErrorNotification_whenConfigured() throws Exception {
        SmtpServerEntity smtpServer = SmtpServerEntity.builder()
                .id(1L)
                .name("Default SMTP")
                .server("smtp.example.com")
                .port(587)
                .active(true)
                .build();

        testJob.setErrorNotificationEmail("admin@example.com");
        testJob.setSmtpServer(smtpServer);

        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenThrow(new RuntimeException("SQL syntax error"));

        reportJobRunner.execute(context);

        verify(emailSender).sendEmail(
                eq(smtpServer),
                eq("admin@example.com"),
                isNull(),
                isNull(),
                contains("Job Failed"),
                contains("SQL syntax error"),
                isNull(),
                isNull(),
                anyList()
        );
    }

    @Test
    void execute_onFailure_noNotification_whenEmailNotConfigured() throws JobExecutionException {
        testJob.setErrorNotificationEmail(null);

        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenThrow(new RuntimeException("Some error"));

        reportJobRunner.execute(context);

        verifyNoInteractions(emailSender);
    }

    @Test
    void execute_onFailure_fallsBackToFirstActiveSmtp_whenJobHasNoSmtpServer() throws Exception {
        SmtpServerEntity fallbackSmtp = SmtpServerEntity.builder()
                .id(2L)
                .name("Fallback SMTP")
                .server("fallback.example.com")
                .port(25)
                .active(true)
                .build();

        testJob.setErrorNotificationEmail("admin@example.com");
        testJob.setSmtpServer(null);

        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenThrow(new RuntimeException("Connection refused"));
        when(smtpServerService.getAllActive()).thenReturn(List.of(fallbackSmtp));

        reportJobRunner.execute(context);

        verify(emailSender).sendEmail(
                eq(fallbackSmtp),
                eq("admin@example.com"),
                isNull(),
                isNull(),
                anyString(),
                anyString(),
                isNull(),
                isNull(),
                anyList()
        );
    }

    @Test
    void execute_onFailure_noNotification_whenNoSmtpServerAvailable() throws JobExecutionException {
        testJob.setErrorNotificationEmail("admin@example.com");
        testJob.setSmtpServer(null);

        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenThrow(new RuntimeException("Error"));
        when(smtpServerService.getAllActive()).thenReturn(List.of());

        reportJobRunner.execute(context);

        verifyNoInteractions(emailSender);
    }

    @Test
    void execute_withEmptyParameterValuesJson_usesEmptyParams() throws JobExecutionException {
        testJob.setParameterValues("");
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(0)
                        .executionMs(50)
                        .columns(List.of())
                        .rows(List.of())
                        .build());

        reportJobRunner.execute(context);

        ArgumentCaptor<Map<String, String>> paramsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(reportRunService).runReport(eq(100L), paramsCaptor.capture());
        assertTrue(paramsCaptor.getValue().isEmpty());
    }

    @Test
    void execute_withPreRunReports_runsThemBeforeMainReport() throws JobExecutionException {
        testJob.setPreRunReportIds("10, 20");
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(5)
                        .executionMs(100)
                        .columns(List.of("col1"))
                        .rows(List.of())
                        .build());
        when(reportRunService.runReport(eq(10L), eq(Map.of())))
                .thenReturn(RunReportResult.builder().rowCount(0).executionMs(10).columns(List.of()).rows(List.of()).build());
        when(reportRunService.runReport(eq(20L), eq(Map.of())))
                .thenReturn(RunReportResult.builder().rowCount(0).executionMs(10).columns(List.of()).rows(List.of()).build());

        reportJobRunner.execute(context);

        // Verify pre-run reports were called
        verify(reportRunService).runReport(eq(10L), eq(Map.of()));
        verify(reportRunService).runReport(eq(20L), eq(Map.of()));
        // Verify main report was also called
        verify(reportRunService).runReport(eq(100L), anyMap());
    }

    @Test
    void execute_withPostRunReports_runsThemAfterMainReport() throws JobExecutionException {
        testJob.setPostRunReportIds("30,40");
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(5)
                        .executionMs(100)
                        .columns(List.of("col1"))
                        .rows(List.of())
                        .build());
        when(reportRunService.runReport(eq(30L), eq(Map.of())))
                .thenReturn(RunReportResult.builder().rowCount(0).executionMs(10).columns(List.of()).rows(List.of()).build());
        when(reportRunService.runReport(eq(40L), eq(Map.of())))
                .thenReturn(RunReportResult.builder().rowCount(0).executionMs(10).columns(List.of()).rows(List.of()).build());

        reportJobRunner.execute(context);

        // Verify post-run reports were called
        verify(reportRunService).runReport(eq(30L), eq(Map.of()));
        verify(reportRunService).runReport(eq(40L), eq(Map.of()));
    }

    @Test
    void execute_preRunReportFailure_doesNotFailEntireJob() throws JobExecutionException {
        testJob.setPreRunReportIds("10");
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        // Pre-run report fails
        when(reportRunService.runReport(eq(10L), eq(Map.of())))
                .thenThrow(new RuntimeException("Pre-run report failed"));
        // Main report succeeds
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(5)
                        .executionMs(100)
                        .columns(List.of("col1"))
                        .rows(List.of())
                        .build());

        reportJobRunner.execute(context);

        // Verify main report still ran and job succeeded
        verify(reportRunService).runReport(eq(100L), anyMap());
        ArgumentCaptor<JobExecutionEntity> executionCaptor = ArgumentCaptor.forClass(JobExecutionEntity.class);
        verify(jobExecutionRepository, times(2)).save(executionCaptor.capture());
        assertEquals("SUCCESS", executionCaptor.getAllValues().get(1).getStatus());
    }

    @Test
    void execute_postRunReportFailure_doesNotFailEntireJob() throws JobExecutionException {
        testJob.setPostRunReportIds("30");
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        // Main report succeeds
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(5)
                        .executionMs(100)
                        .columns(List.of("col1"))
                        .rows(List.of())
                        .build());
        // Post-run report fails
        when(reportRunService.runReport(eq(30L), eq(Map.of())))
                .thenThrow(new RuntimeException("Post-run report failed"));

        reportJobRunner.execute(context);

        // Verify job still succeeds despite post-run failure
        ArgumentCaptor<JobExecutionEntity> executionCaptor = ArgumentCaptor.forClass(JobExecutionEntity.class);
        verify(jobExecutionRepository, times(2)).save(executionCaptor.capture());
        assertEquals("SUCCESS", executionCaptor.getAllValues().get(1).getStatus());
    }

    @Test
    void execute_withNullPreRunReportIds_skipsPreRunReports() throws JobExecutionException {
        testJob.setPreRunReportIds(null);
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(5)
                        .executionMs(100)
                        .columns(List.of("col1"))
                        .rows(List.of())
                        .build());

        reportJobRunner.execute(context);

        // Only the main report should be called
        verify(reportRunService, times(1)).runReport(anyLong(), anyMap());
    }

    @Test
    void execute_withBlankBatchFile_skipsBatchExecution() throws JobExecutionException {
        testJob.setBatchFile("   ");
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(5)
                        .executionMs(100)
                        .columns(List.of("col1"))
                        .rows(List.of())
                        .build());

        // Should not throw — batch file is blank, so it's skipped
        reportJobRunner.execute(context);

        ArgumentCaptor<JobExecutionEntity> executionCaptor = ArgumentCaptor.forClass(JobExecutionEntity.class);
        verify(jobExecutionRepository, times(2)).save(executionCaptor.capture());
        assertEquals("SUCCESS", executionCaptor.getAllValues().get(1).getStatus());
    }

    @Test
    void execute_withInvalidPreRunReportId_skipsInvalidAndContinues() throws JobExecutionException {
        testJob.setPreRunReportIds("10, abc, 20");
        when(jobRepository.findById(42L)).thenReturn(Optional.of(testJob));
        when(jobExecutionRepository.save(any(JobExecutionEntity.class)))
                .thenAnswer(invocation -> {
                    JobExecutionEntity entity = invocation.getArgument(0);
                    entity.setId(1L);
                    return entity;
                });
        when(reportRunService.runReport(eq(10L), eq(Map.of())))
                .thenReturn(RunReportResult.builder().rowCount(0).executionMs(10).columns(List.of()).rows(List.of()).build());
        when(reportRunService.runReport(eq(20L), eq(Map.of())))
                .thenReturn(RunReportResult.builder().rowCount(0).executionMs(10).columns(List.of()).rows(List.of()).build());
        when(reportRunService.runReport(eq(100L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .rowCount(5)
                        .executionMs(100)
                        .columns(List.of("col1"))
                        .rows(List.of())
                        .build());

        reportJobRunner.execute(context);

        // Valid IDs (10, 20) should still be called; "abc" is skipped
        verify(reportRunService).runReport(eq(10L), eq(Map.of()));
        verify(reportRunService).runReport(eq(20L), eq(Map.of()));
    }
}
