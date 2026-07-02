package com.insighthub.job.scheduler;

import com.insighthub.job.JobEntity;
import com.insighthub.report.ReportRunService;
import com.insighthub.report.RunReportResult;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service for resolving dynamic recipients from a configured report query.
 * <p>
 * Dynamic recipients are determined by executing the job's dynamic_recipients_report.
 * The first column of the result contains email addresses. Additional columns
 * are available for personalization (replacing #column_name# placeholders in
 * email subject/body) and for filtering (recipient_column/recipient_id columns
 * enable per-recipient data filtering in the main report).
 * </p>
 */
@Service
@RequiredArgsConstructor
public class DynamicRecipientsService {

    private static final Logger log = LoggerFactory.getLogger(DynamicRecipientsService.class);

    private final ReportRunService reportRunService;

    /**
     * Resolves dynamic recipients for a job by executing the dynamic recipients report.
     *
     * @param job the job entity with a configured dynamicRecipientsReportId
     * @return list of resolved recipients, or empty list if no dynamic recipients report is configured
     * @throws IllegalStateException if the dynamic recipients report execution fails
     */
    public List<DynamicRecipient> resolveRecipients(JobEntity job) {
        Long reportId = job.getDynamicRecipientsReportId();
        if (reportId == null) {
            return Collections.emptyList();
        }

        log.info("Resolving dynamic recipients for job id={} using report id={}", job.getId(), reportId);

        RunReportResult result = reportRunService.runReport(reportId, Map.of());

        if (result.getColumns() == null || result.getColumns().isEmpty()) {
            log.warn("Dynamic recipients report id={} returned no columns", reportId);
            return Collections.emptyList();
        }

        if (result.getRows() == null || result.getRows().isEmpty()) {
            log.info("Dynamic recipients report id={} returned no rows", reportId);
            return Collections.emptyList();
        }

        String emailColumn = result.getColumns().get(0);
        List<DynamicRecipient> recipients = new ArrayList<>();

        for (Map<String, Object> row : result.getRows()) {
            Object emailValue = row.get(emailColumn);
            if (emailValue == null || emailValue.toString().isBlank()) {
                continue;
            }

            String email = emailValue.toString().trim();

            // Build column values map (all columns including email, keyed by lowercase name)
            Map<String, String> columns = new LinkedHashMap<>();
            for (String col : result.getColumns()) {
                Object value = row.get(col);
                columns.put(col.toLowerCase(), value != null ? value.toString() : "");
            }

            recipients.add(new DynamicRecipient(email, columns));
        }

        log.info("Resolved {} dynamic recipients for job id={}", recipients.size(), job.getId());
        return recipients;
    }

    /**
     * Applies personalization by replacing #column_name# placeholders in the given text
     * with the corresponding values from the recipient's columns.
     *
     * @param text      the text containing #column_name# placeholders (e.g., email subject or body)
     * @param recipient the dynamic recipient whose column values will be substituted
     * @return the personalized text with placeholders replaced
     */
    public String personalize(String text, DynamicRecipient recipient) {
        if (text == null || text.isEmpty() || recipient.columns() == null) {
            return text;
        }

        String result = text;
        for (Map.Entry<String, String> entry : recipient.columns().entrySet()) {
            String placeholder = "#" + entry.getKey() + "#";
            result = result.replace(placeholder, entry.getValue());
        }
        return result;
    }
}
