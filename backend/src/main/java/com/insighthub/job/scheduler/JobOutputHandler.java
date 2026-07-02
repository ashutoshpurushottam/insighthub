package com.insighthub.job.scheduler;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.report.RunReportResult;

/**
 * Strategy interface for handling the output of a scheduled job execution.
 * <p>
 * Each job type (Email Attachment, Email Inline, Publish, Alert, Burst,
 * Conditional Email, Conditional Publish) provides its own implementation
 * of this interface to process the report results appropriately.
 * </p>
 * <p>
 * Implementations are called by {@link ReportJobRunner} after the report
 * has been executed, with the full job configuration, execution record,
 * and report result data available for processing.
 * </p>
 */
public interface JobOutputHandler {

    /**
     * Handles the output of a job execution based on the job type's requirements.
     * <p>
     * Depending on the implementation, this may:
     * <ul>
     *   <li>Send an email with the report as an attachment (EmailAttachmentHandler)</li>
     *   <li>Send an email with the report rendered inline as HTML (EmailInlineHandler)</li>
     *   <li>Save the report output to a file on the server (PublishHandler)</li>
     *   <li>Evaluate an alert condition and send a notification (AlertHandler)</li>
     *   <li>Split the report into per-group files (BurstHandler)</li>
     *   <li>Conditionally send/publish only if results exist (ConditionalHandlers)</li>
     * </ul>
     *
     * @param job       the job entity containing all configuration (email fields, output format, etc.)
     * @param execution the current execution record (for tracking/archiving purposes)
     * @param result    the report execution result containing columns, rows, row count, and execution time
     * @return a {@link JobHandlerResult} indicating success/failure, output file path, and a message
     */
    JobHandlerResult handle(JobEntity job, JobExecutionEntity execution, RunReportResult result);
}
