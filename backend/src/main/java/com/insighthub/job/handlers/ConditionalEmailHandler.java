package com.insighthub.job.handlers;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.JobType;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.job.scheduler.JobOutputHandler;
import com.insighthub.report.RunReportResult;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Conditional email handler that only sends an email if the report result has rows.
 * <p>
 * Supports both "Conditional Email (Attachment)" and "Conditional Email (Inline)" job types.
 * If the result has no rows, the execution is marked as skipped (success with no action).
 * If the result has rows, it delegates to either {@link EmailAttachmentHandler} or
 * {@link EmailInlineHandler} based on the job type.
 * </p>
 *
 * <p>Implements Requirement 7: Job Types — Conditional Email/Publish</p>
 */
@Component
@RequiredArgsConstructor
public class ConditionalEmailHandler implements JobOutputHandler {

    private static final Logger log = LoggerFactory.getLogger(ConditionalEmailHandler.class);

    private final EmailAttachmentHandler emailAttachmentHandler;
    private final EmailInlineHandler emailInlineHandler;

    @Override
    public JobHandlerResult handle(JobEntity job, JobExecutionEntity execution, RunReportResult result) {
        log.info("ConditionalEmailHandler processing job id={}, name='{}', type={}",
                job.getId(), job.getName(), job.getJobType());

        // Check if result has rows
        if (result.getRowCount() == 0 || result.getRows().isEmpty()) {
            log.info("No rows returned for job id={} — skipping email send", job.getId());
            return JobHandlerResult.success("Skipped: no rows returned");
        }

        // Delegate based on job type
        if (job.getJobType() == JobType.CONDITIONAL_EMAIL_INLINE) {
            log.info("Delegating to EmailInlineHandler for job id={}", job.getId());
            return emailInlineHandler.handle(job, execution, result);
        }

        // Default: CONDITIONAL_EMAIL_ATTACHMENT
        log.info("Delegating to EmailAttachmentHandler for job id={}", job.getId());
        return emailAttachmentHandler.handle(job, execution, result);
    }
}
