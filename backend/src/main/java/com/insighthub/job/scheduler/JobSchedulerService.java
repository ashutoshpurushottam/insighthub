package com.insighthub.job.scheduler;

import com.insighthub.job.JobEntity;
import org.quartz.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.util.*;

/**
 * Service responsible for scheduling, unscheduling, and rescheduling jobs
 * with Quartz Scheduler based on the cron fields defined in a {@link JobEntity}.
 */
@Service
public class JobSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(JobSchedulerService.class);

    private static final String JOB_GROUP = "report-jobs";
    private static final String TRIGGER_GROUP = "report-triggers";

    private final Scheduler scheduler;

    public JobSchedulerService(Scheduler scheduler) {
        this.scheduler = scheduler;
    }

    /**
     * Schedules a job with Quartz. Builds a cron trigger from the job's individual
     * cron fields and registers the job detail + trigger(s) with the scheduler.
     * If extra schedules are defined, additional triggers are created.
     *
     * @param job the job entity containing schedule configuration
     * @throws SchedulerException if the job cannot be scheduled
     */
    public void scheduleJob(JobEntity job) throws SchedulerException {
        if (job.isManual()) {
            log.debug("Job {} is manual — skipping automatic scheduling", job.getId());
            return;
        }

        JobDetail jobDetail = buildJobDetail(job);
        CronTrigger primaryTrigger = buildPrimaryTrigger(job);

        scheduler.scheduleJob(jobDetail, primaryTrigger);
        log.info("Scheduled job {} with cron: {}", job.getId(), primaryTrigger.getCronExpression());

        // Handle extra schedules (additional triggers for the same job)
        List<CronTrigger> extraTriggers = buildExtraTriggers(job);
        for (CronTrigger extraTrigger : extraTriggers) {
            scheduler.scheduleJob(extraTrigger);
            log.info("Added extra trigger for job {}: {}", job.getId(), extraTrigger.getCronExpression());
        }
    }

    /**
     * Removes all triggers and the job detail from Quartz for the given job ID.
     *
     * @param jobId the ID of the job to unschedule
     * @throws SchedulerException if the job cannot be unscheduled
     */
    public void unscheduleJob(Long jobId) throws SchedulerException {
        JobKey jobKey = buildJobKey(jobId);

        // Get all triggers for this job and unschedule them
        List<? extends Trigger> triggers = scheduler.getTriggersOfJob(jobKey);
        if (triggers != null && !triggers.isEmpty()) {
            List<TriggerKey> triggerKeys = new ArrayList<>();
            for (Trigger trigger : triggers) {
                triggerKeys.add(trigger.getKey());
            }
            scheduler.unscheduleJobs(triggerKeys);
        }

        // Delete the job detail
        boolean deleted = scheduler.deleteJob(jobKey);
        if (deleted) {
            log.info("Unscheduled job {}", jobId);
        } else {
            log.debug("Job {} was not found in Quartz — nothing to unschedule", jobId);
        }
    }

    /**
     * Reschedules an existing job by unscheduling it and scheduling it again
     * with the updated configuration.
     *
     * @param job the updated job entity
     * @throws SchedulerException if the job cannot be rescheduled
     */
    public void rescheduleJob(JobEntity job) throws SchedulerException {
        unscheduleJob(job.getId());
        scheduleJob(job);
    }

    /**
     * Immediately triggers a job for execution using the Quartz thread pool.
     * If the job doesn't already have a registered Quartz JobDetail (e.g., manual jobs),
     * a durable JobDetail is created temporarily so that it can be triggered.
     *
     * @param job the job entity to trigger
     * @throws SchedulerException if the job cannot be triggered
     */
    public void triggerJobNow(JobEntity job) throws SchedulerException {
        JobKey jobKey = buildJobKey(job.getId());

        // If the job is not already registered with Quartz (e.g., manual jobs),
        // create a durable JobDetail so we can trigger it.
        if (!scheduler.checkExists(jobKey)) {
            JobDetail jobDetail = JobBuilder.newJob(ReportJobRunner.class)
                    .withIdentity(jobKey)
                    .withDescription(job.getName() + " (manual trigger)")
                    .usingJobData(ReportJobRunner.JOB_ID_KEY, job.getId().toString())
                    .storeDurably(true)
                    .build();
            scheduler.addJob(jobDetail, false);
            log.info("Registered durable job detail for manual trigger: job id={}", job.getId());
        }

        scheduler.triggerJob(jobKey);
        log.info("Triggered immediate execution for job id={}", job.getId());
    }

    /**
     * Builds a Quartz cron expression from the individual cron fields of a JobEntity.
     * Format: {second} {minute} {hour} {day} {month} {weekday} {year}
     *
     * @param job the job entity
     * @return the constructed cron expression string
     */
    public String buildCronExpression(JobEntity job) {
        String second = defaultIfBlank(job.getCronSecond(), "0");
        String minute = defaultIfBlank(job.getCronMinute(), "0");
        String hour = defaultIfBlank(job.getCronHour(), "*");
        String day = defaultIfBlank(job.getCronDay(), "?");
        String month = defaultIfBlank(job.getCronMonth(), "*");
        String weekday = defaultIfBlank(job.getCronWeekday(), "*");
        String year = defaultIfBlank(job.getCronYear(), "*");

        return String.join(" ", second, minute, hour, day, month, weekday, year);
    }

    // ==================== Internal helpers ====================

    private JobDetail buildJobDetail(JobEntity job) {
        return JobBuilder.newJob(ReportJobRunner.class)
                .withIdentity(buildJobKey(job.getId()))
                .withDescription(job.getName())
                .usingJobData(ReportJobRunner.JOB_ID_KEY, job.getId().toString())
                .storeDurably(false)
                .build();
    }

    private CronTrigger buildPrimaryTrigger(JobEntity job) {
        String cronExpression = buildCronExpression(job);
        TriggerKey triggerKey = new TriggerKey("trigger-" + job.getId(), TRIGGER_GROUP);
        return buildCronTrigger(triggerKey, cronExpression, job);
    }

    private List<CronTrigger> buildExtraTriggers(JobEntity job) {
        List<CronTrigger> triggers = new ArrayList<>();
        String extraSchedules = job.getExtraSchedules();

        if (extraSchedules == null || extraSchedules.isBlank()) {
            return triggers;
        }

        String[] lines = extraSchedules.split("\\R");
        int index = 1;
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            TriggerKey triggerKey = new TriggerKey(
                    "trigger-" + job.getId() + "-extra-" + index, TRIGGER_GROUP);
            CronTrigger trigger = buildCronTrigger(triggerKey, trimmed, job);
            triggers.add(trigger);
            index++;
        }
        return triggers;
    }

    private CronTrigger buildCronTrigger(TriggerKey triggerKey, String cronExpression, JobEntity job) {
        CronScheduleBuilder scheduleBuilder = CronScheduleBuilder
                .cronSchedule(cronExpression)
                .withMisfireHandlingInstructionDoNothing();

        // Set time zone if specified
        if (job.getTimeZone() != null && !job.getTimeZone().isBlank()) {
            TimeZone timeZone = TimeZone.getTimeZone(ZoneId.of(job.getTimeZone()));
            scheduleBuilder = scheduleBuilder.inTimeZone(timeZone);
        }

        TriggerBuilder<CronTrigger> triggerBuilder = TriggerBuilder.newTrigger()
                .withIdentity(triggerKey)
                .forJob(buildJobKey(job.getId()))
                .withSchedule(scheduleBuilder);

        // Set start date if specified
        if (job.getStartDate() != null) {
            Date startDate = Date.from(
                    job.getStartDate().atZone(resolveZoneId(job)).toInstant());
            triggerBuilder.startAt(startDate);
        } else {
            triggerBuilder.startNow();
        }

        // Set end date if specified
        if (job.getEndDate() != null) {
            Date endDate = Date.from(
                    job.getEndDate().atZone(resolveZoneId(job)).toInstant());
            triggerBuilder.endAt(endDate);
        }

        return triggerBuilder.build();
    }

    private JobKey buildJobKey(Long jobId) {
        return new JobKey("job-" + jobId, JOB_GROUP);
    }

    private ZoneId resolveZoneId(JobEntity job) {
        if (job.getTimeZone() != null && !job.getTimeZone().isBlank()) {
            return ZoneId.of(job.getTimeZone());
        }
        return ZoneId.systemDefault();
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return (value == null || value.isBlank()) ? defaultValue : value;
    }
}
