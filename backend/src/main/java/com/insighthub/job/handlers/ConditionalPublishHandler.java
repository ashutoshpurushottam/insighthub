package com.insighthub.job.handlers;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.job.scheduler.JobOutputHandler;
import com.insighthub.report.RunReportResult;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Conditional publish handler that only publishes output if the report result has rows.
 * <p>
 * If the result has no rows, the execution is marked as skipped (success with no action).
 * If the result has rows, it delegates to {@link PublishHandler} to perform the actual
 * file publishing and notification.
 * </p>
 *
 * <p>Implements Requirement 7: Job Types — Conditional Email/Publish</p>
 */
@Component
@RequiredArgsConstructor
public class ConditionalPublishHandler implements JobOutputHandler {

    private static final Logger log = LoggerFactory.getLogger(ConditionalPublishHandler.class);

    private final PublishHandler publishHandler;

    @Override
    public JobHandlerResult handle(JobEntity job, JobExecutionEntity execution, RunReportResult result) {
        log.info("ConditionalPublishHandler processing job id={}, name='{}'", job.getId(), job.getName());

        // Check if result has rows
        if (result.getRowCount() == 0 || result.getRows().isEmpty()) {
            log.info("No rows returned for job id={} — skipping publish", job.getId());
            return JobHandlerResult.success("Skipped: no rows returned");
        }

        // Delegate to PublishHandler
        log.info("Delegating to PublishHandler for job id={}", job.getId());
        return publishHandler.handle(job, execution, result);
    }
}
