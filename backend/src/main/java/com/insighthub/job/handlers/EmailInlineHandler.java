package com.insighthub.job.handlers;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.job.scheduler.JobOutputHandler;
import com.insighthub.report.RunReportResult;
import com.insighthub.smtp.EmailSender;
import com.insighthub.smtp.SmtpServerEntity;
import com.insighthub.smtp.SmtpServerService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Job output handler that renders report results as an HTML table
 * and sends them inline in the email body (no attachments).
 * <p>
 * Implements the "Email (Inline)" job type (Requirement 4) where recipients
 * see report results directly in the email without opening an attachment.
 * </p>
 */
@Component
@RequiredArgsConstructor
public class EmailInlineHandler implements JobOutputHandler {

    private static final Logger log = LoggerFactory.getLogger(EmailInlineHandler.class);

    private final EmailSender emailSender;
    private final SmtpServerService smtpServerService;

    @Override
    public JobHandlerResult handle(JobEntity job, JobExecutionEntity execution, RunReportResult result) {
        log.info("EmailInlineHandler processing job id={}, name='{}'", job.getId(), job.getName());

        // Resolve SMTP server: job's configured server first, then first active
        SmtpServerEntity smtp = resolveSmtpServer(job);
        if (smtp == null) {
            String msg = "No SMTP server available for job id=" + job.getId();
            log.error(msg);
            return JobHandlerResult.failure(msg);
        }

        try {
            // Render the report as an HTML table
            String htmlTable = renderHtmlTable(result);

            // Build the full email body: prepend email message (if any) before the table
            String emailBody = buildEmailBody(job.getEmailMessage(), htmlTable);

            // Send email with HTML body, no attachments
            emailSender.sendEmail(
                    smtp,
                    job.getEmailTo(),
                    job.getEmailCc(),
                    job.getEmailBcc(),
                    job.getEmailSubject(),
                    emailBody,
                    job.getEmailFrom(),
                    job.getEmailReplyTo(),
                    List.of()
            );

            String successMsg = String.format("Inline email sent to %s with %d rows",
                    job.getEmailTo(), result.getRowCount());
            log.info(successMsg);
            return JobHandlerResult.success(successMsg);

        } catch (Exception e) {
            String errorMsg = "Failed to send inline email for job id=" + job.getId() + ": " + e.getMessage();
            log.error(errorMsg, e);
            return JobHandlerResult.failure(errorMsg);
        }
    }

    /**
     * Resolves the SMTP server to use: the job's configured SMTP server first,
     * then falls back to the first active SMTP server in the system.
     */
    private SmtpServerEntity resolveSmtpServer(JobEntity job) {
        if (job.getSmtpServer() != null && job.getSmtpServer().isActive()) {
            return job.getSmtpServer();
        }
        List<SmtpServerEntity> activeServers = smtpServerService.getAllActive();
        return activeServers.isEmpty() ? null : activeServers.get(0);
    }

    /**
     * Builds the complete email body by prepending the job's email message
     * (if configured) before the HTML table.
     */
    String buildEmailBody(String emailMessage, String htmlTable) {
        StringBuilder body = new StringBuilder();

        if (emailMessage != null && !emailMessage.isBlank()) {
            body.append("<div style=\"margin-bottom: 16px;\">")
                    .append(escapeHtml(emailMessage).replace("\n", "<br/>"))
                    .append("</div>");
        }

        body.append(htmlTable);
        return body.toString();
    }

    /**
     * Renders the report results as a styled HTML table with column headers and data rows.
     */
    String renderHtmlTable(RunReportResult result) {
        StringBuilder html = new StringBuilder();

        html.append("<table style=\"border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 13px;\">");

        // Render table header
        html.append("<thead><tr>");
        for (String column : result.getColumns()) {
            html.append("<th style=\"border: 1px solid #ddd; padding: 8px 12px; background-color: #f2f2f2; text-align: left; font-weight: bold;\">")
                    .append(escapeHtml(column))
                    .append("</th>");
        }
        html.append("</tr></thead>");

        // Render table body
        html.append("<tbody>");
        for (Map<String, Object> row : result.getRows()) {
            html.append("<tr>");
            for (String column : result.getColumns()) {
                Object value = row.get(column);
                String displayValue = value != null ? value.toString() : "";
                html.append("<td style=\"border: 1px solid #ddd; padding: 8px 12px;\">")
                        .append(escapeHtml(displayValue))
                        .append("</td>");
            }
            html.append("</tr>");
        }
        html.append("</tbody>");

        html.append("</table>");
        return html.toString();
    }

    /**
     * Basic HTML escaping to prevent XSS in email content.
     */
    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
