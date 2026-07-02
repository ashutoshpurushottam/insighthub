package com.insighthub.job.scheduler;

import com.insighthub.job.JobEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.*;
import org.quartz.impl.triggers.CronTriggerImpl;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class JobSchedulerServiceTest {

    @Mock
    private Scheduler scheduler;

    @InjectMocks
    private JobSchedulerService service;

    @Captor
    private ArgumentCaptor<JobDetail> jobDetailCaptor;

    @Captor
    private ArgumentCaptor<CronTrigger> triggerCaptor;

    private JobEntity testJob;

    @BeforeEach
    void setUp() {
        testJob = JobEntity.builder()
                .id(42L)
                .name("Daily Report")
                .cronSecond("0")
                .cronMinute("30")
                .cronHour("8")
                .cronDay("?")
                .cronMonth("*")
                .cronWeekday("MON-FRI")
                .cronYear("*")
                .manual(false)
                .build();
    }

    // ==================== buildCronExpression tests ====================

    @Test
    void buildCronExpression_constructsFromIndividualFields() {
        String cron = service.buildCronExpression(testJob);
        assertEquals("0 30 8 ? * MON-FRI *", cron);
    }

    @Test
    void buildCronExpression_usesDefaults_whenFieldsAreNull() {
        JobEntity job = JobEntity.builder()
                .id(1L)
                .cronSecond(null)
                .cronMinute(null)
                .cronHour(null)
                .cronDay(null)
                .cronMonth(null)
                .cronWeekday(null)
                .cronYear(null)
                .build();

        String cron = service.buildCronExpression(job);
        assertEquals("0 0 * ? * * *", cron);
    }

    @Test
    void buildCronExpression_usesDefaults_whenFieldsAreBlank() {
        JobEntity job = JobEntity.builder()
                .id(1L)
                .cronSecond("")
                .cronMinute("  ")
                .cronHour("")
                .cronDay("")
                .cronMonth("")
                .cronWeekday("")
                .cronYear("")
                .build();

        String cron = service.buildCronExpression(job);
        assertEquals("0 0 * ? * * *", cron);
    }

    @Test
    void buildCronExpression_handlesEveryMinute() {
        JobEntity job = JobEntity.builder()
                .id(1L)
                .cronSecond("0")
                .cronMinute("*")
                .cronHour("*")
                .cronDay("*")
                .cronMonth("*")
                .cronWeekday("?")
                .cronYear("*")
                .build();

        String cron = service.buildCronExpression(job);
        assertEquals("0 * * * * ? *", cron);
    }

    // ==================== scheduleJob tests ====================

    @Test
    void scheduleJob_registersJobAndTrigger_withQuartz() throws SchedulerException {
        when(scheduler.scheduleJob(any(JobDetail.class), any(Trigger.class)))
                .thenReturn(null);

        service.scheduleJob(testJob);

        verify(scheduler).scheduleJob(jobDetailCaptor.capture(), triggerCaptor.capture());

        JobDetail detail = jobDetailCaptor.getValue();
        assertEquals("job-42", detail.getKey().getName());
        assertEquals("report-jobs", detail.getKey().getGroup());
        assertEquals("42", detail.getJobDataMap().getString("jobId"));
        assertEquals(ReportJobRunner.class, detail.getJobClass());

        CronTrigger trigger = triggerCaptor.getValue();
        assertEquals("0 30 8 ? * MON-FRI *", trigger.getCronExpression());
        assertEquals("trigger-42", trigger.getKey().getName());
        assertEquals("report-triggers", trigger.getKey().getGroup());
    }

    @Test
    void scheduleJob_skipsScheduling_whenJobIsManual() throws SchedulerException {
        testJob.setManual(true);

        service.scheduleJob(testJob);

        verifyNoInteractions(scheduler);
    }

    @Test
    void scheduleJob_setsTimeZone_whenSpecified() throws SchedulerException {
        testJob.setTimeZone("America/New_York");
        when(scheduler.scheduleJob(any(JobDetail.class), any(Trigger.class)))
                .thenReturn(null);

        service.scheduleJob(testJob);

        verify(scheduler).scheduleJob(any(JobDetail.class), triggerCaptor.capture());
        CronTrigger trigger = triggerCaptor.getValue();
        assertEquals(TimeZone.getTimeZone("America/New_York"), trigger.getTimeZone());
    }

    @Test
    void scheduleJob_setsStartAndEndDates_whenSpecified() throws SchedulerException {
        testJob.setStartDate(LocalDateTime.of(2025, 1, 15, 0, 0));
        testJob.setEndDate(LocalDateTime.of(2025, 12, 31, 23, 59));
        when(scheduler.scheduleJob(any(JobDetail.class), any(Trigger.class)))
                .thenReturn(null);

        service.scheduleJob(testJob);

        verify(scheduler).scheduleJob(any(JobDetail.class), triggerCaptor.capture());
        CronTrigger trigger = triggerCaptor.getValue();
        assertNotNull(trigger.getStartTime());
        assertNotNull(trigger.getEndTime());
    }

    @Test
    void scheduleJob_createsExtraTriggers_whenExtraSchedulesProvided() throws SchedulerException {
        testJob.setExtraSchedules("0 0 12 * * ? *\n0 0 18 * * ? *");
        when(scheduler.scheduleJob(any(JobDetail.class), any(Trigger.class)))
                .thenReturn(null);

        service.scheduleJob(testJob);

        // Primary trigger
        verify(scheduler).scheduleJob(any(JobDetail.class), any(Trigger.class));
        // Extra triggers (2)
        verify(scheduler, times(2)).scheduleJob(any(Trigger.class));
    }

    @Test
    void scheduleJob_ignoresBlankLines_inExtraSchedules() throws SchedulerException {
        testJob.setExtraSchedules("0 0 12 * * ? *\n\n  \n0 0 18 * * ? *\n");
        when(scheduler.scheduleJob(any(JobDetail.class), any(Trigger.class)))
                .thenReturn(null);

        service.scheduleJob(testJob);

        // Only 2 extra triggers (blank lines ignored)
        verify(scheduler, times(2)).scheduleJob(any(Trigger.class));
    }

    // ==================== unscheduleJob tests ====================

    @Test
    void unscheduleJob_removesAllTriggersAndJob() throws SchedulerException {
        JobKey jobKey = new JobKey("job-42", "report-jobs");
        TriggerKey triggerKey1 = new TriggerKey("trigger-42", "report-triggers");
        TriggerKey triggerKey2 = new TriggerKey("trigger-42-extra-1", "report-triggers");

        CronTriggerImpl trigger1 = new CronTriggerImpl();
        trigger1.setKey(triggerKey1);
        CronTriggerImpl trigger2 = new CronTriggerImpl();
        trigger2.setKey(triggerKey2);

        doReturn(List.of(trigger1, trigger2)).when(scheduler).getTriggersOfJob(jobKey);
        when(scheduler.unscheduleJobs(any())).thenReturn(true);
        when(scheduler.deleteJob(jobKey)).thenReturn(true);

        service.unscheduleJob(42L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TriggerKey>> keysCaptor = ArgumentCaptor.forClass(List.class);
        verify(scheduler).unscheduleJobs(keysCaptor.capture());
        assertEquals(2, keysCaptor.getValue().size());
        verify(scheduler).deleteJob(jobKey);
    }

    @Test
    void unscheduleJob_handlesNoExistingTriggers() throws SchedulerException {
        JobKey jobKey = new JobKey("job-99", "report-jobs");
        doReturn(Collections.emptyList()).when(scheduler).getTriggersOfJob(jobKey);
        when(scheduler.deleteJob(jobKey)).thenReturn(false);

        service.unscheduleJob(99L);

        verify(scheduler, never()).unscheduleJobs(any());
        verify(scheduler).deleteJob(jobKey);
    }

    // ==================== rescheduleJob tests ====================

    @Test
    void rescheduleJob_unschedulesAndReschedulesJob() throws SchedulerException {
        JobKey jobKey = new JobKey("job-42", "report-jobs");
        doReturn(Collections.emptyList()).when(scheduler).getTriggersOfJob(jobKey);
        when(scheduler.deleteJob(jobKey)).thenReturn(true);
        when(scheduler.scheduleJob(any(JobDetail.class), any(Trigger.class)))
                .thenReturn(null);

        service.rescheduleJob(testJob);

        // Verify unschedule was called
        verify(scheduler).deleteJob(jobKey);
        // Verify schedule was called
        verify(scheduler).scheduleJob(any(JobDetail.class), any(Trigger.class));
    }
}
