package com.insighthub.job.handlers;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.job.scheduler.JobOutputHandler;
import com.insighthub.report.RunReportResult;
import com.insighthub.smtp.EmailSender;
import com.insighthub.smtp.SmtpServerEntity;
import com.insighthub.smtp.SmtpServerService;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Job output handler for the "Alert" job type (Requirement 6).
 * <p>
 * Evaluates the first column of the first row of the report result.
 * If the value is numeric and greater than 0, an alert email is sent
 * to the configured recipients. Otherwise, no action is taken.
 * </p>
 * <p>
 * The alert condition is:
 * <ul>
 *   <li>Result has no rows → no alert (success, no action needed)</li>
 *   <li>First column of first row is null → no alert</li>
 *   <li>First column of first row <= 0 → no alert</li>
 *   <li>First column of first row > 0 → send alert email</li>
 * </ul>
 * </p>
 */
@Component
@RequiredArgsConstructor
public class AlertHandler implements JobOutputHandler {

    private static final Logger log = LoggerFactory.getLogger(AlertHandler.class);

    private final EmailSender emailSender;
    private final SmtpServerService smtpServerService;

    @Override
    public JobHandlerResult handle(JobEntity job, JobExecutionEntity execution, RunReportResult result) {
        log.info("AlertHandler processing job id={}, name='{}'", job.getId(), job.getName());

        // Step 1: Check if result has any rows. If no rows, no alert needed.
        if (result.getRows() == null || result.getRows().isEmpty()) {
            log.info("Alert job id={}: no rows returned, no alert triggered", job.getId());
            return JobHandlerResult.success("No rows returned — alert not triggered");
        }

        // Step 2: Get the first row and the value of the first column
        List<String> columns = result.getColumns();
        if (columns == null || columns.isEmpty()) {
            log.info("Alert job id={}: no columns in result, no alert triggered", job.getId());
            return JobHandlerResult.success("No columns in result — alert not triggered");
        }

        String firstColumn = columns.get(0);
        Map<String, Object> firstRow = result.getRows().get(0);
        Object value = firstRow.get(firstColumn);

        // Step 3: Convert to a number and check if > 0
        if (value == null) {
            log.info("Alert job id={}: first column value is null, no alert triggered", job.getId());
            return JobHandlerResult.success("Alert value is null — alert not triggered");
        }

        double numericValue;
        try {
            numericValue = ((Number) value).doubleValue();
        } catch (ClassCastException e) {
            // Try parsing as string if it's not directly a Number
            try {
                numericValue = Double.parseDouble(value.toString().trim());
            } catch (NumberFormatException nfe) {
                log.warn("Alert job id={}: first column value '{}' is not numeric, no alert triggered",
                        job.getId(), value);
                return JobHandlerResult.success("Alert value is not numeric — alert not triggered");
            }
        }

        // Step 4: If value <= 0, no alert triggered
        if (numericValue <= 0) {
            log.info("Alert job id={}: value={} is <= 0, no alert triggered", job.getId(), numericValue);
            return JobHandlerResult.success("Alert value is " + numericValue + " — alert not triggered");
        }

        // Step 5: Value > 0 — send alert email
        log.info("Alert job id={}: value={} > 0, sending alert email to: {}", job.getId(), numericValue, job.getEmailTo());

        // Step 6: Resolve SMTP server (job's configured server or first active)
        SmtpServerEntity smtp = resolveSmtpServer(job);
        if (smtp == null) {
            log.error("No SMTP server available for alert job id={}", job.getId());
            return JobHandlerResult.failure("No SMTP server available to send alert email");
        }

        try {
            emailSender.sendEmail(
                    smtp,
                    job.getEmailTo(),
                    job.getEmailCc(),
                    job.getEmailBcc(),
                    job.getEmailSubject(),
                    job.getEmailMessage(),
                    job.getEmailFrom(),
                    job.getEmailReplyTo(),
                    List.of()
            );

            String successMsg = String.format("Alert triggered (value=%s) — email sent to %s",
                    numericValue, job.getEmailTo());
            log.info(successMsg);
            return JobHandlerResult.success(successMsg);

        } catch (MessagingException e) {
            log.error("Failed to send alert email for job id={}: {}", job.getId(), e.getMessage(), e);
            return JobHandlerResult.failure("Alert email send failed: " + e.getMessage());
        }
    }

    /**
     * Resolves the SMTP server to use for sending the alert.
     * <p>
     * Priority:
     * <ol>
     *   <li>The job's explicitly configured SMTP server (if active)</li>
     *   <li>The first active SMTP server in the system (global default)</li>
     * </ol>
     *
     * @param job the job entity
     * @return the resolved SmtpServerEntity, or null if none available
     */
    private SmtpServerEntity resolveSmtpServer(JobEntity job) {
        if (job.getSmtpServer() != null && job.getSmtpServer().isActive()) {
            return job.getSmtpServer();
        }
        List<SmtpServerEntity> activeServers = smtpServerService.getAllActive();
        return activeServers.isEmpty() ? null : activeServers.get(0);
    }
}
