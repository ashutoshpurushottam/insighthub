package com.insighthub.job.scheduler;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.JobExecutionRepository;
import com.insighthub.job.JobRepository;
import com.insighthub.report.ReportRunService;
import com.insighthub.report.RunReportResult;
import com.insighthub.smtp.EmailSender;
import com.insighthub.smtp.SmtpServerEntity;
import com.insighthub.smtp.SmtpServerService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.MessagingException;
import org.quartz.DisallowConcurrentExecution;
import org.quartz.InterruptableJob;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.UnableToInterruptJobException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Quartz Job implementation that executes a scheduled report job.
 * <p>
 * This is the main entry point called by Quartz when a trigger fires.
 * It loads the job definition from the database, validates it, creates
 * an execution record, runs the report, and updates the execution status.
 * </p>
 * <p>
 * {@code @DisallowConcurrentExecution} prevents the same job from running
 * concurrently if a previous execution is still in progress.
 * </p>
 */
@Component
@DisallowConcurrentExecution
public class ReportJobRunner implements InterruptableJob {

    private static final Logger log = LoggerFactory.getLogger(ReportJobRunner.class);

    /**
     * Key used to store/retrieve the job ID in Quartz's JobDataMap.
     */
    public static final String JOB_ID_KEY = "jobId";

    /**
     * Volatile flag set by {@link #interrupt()} to signal that the job should stop execution.
     */
    private volatile boolean interrupted = false;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private JobExecutionRepository jobExecutionRepository;

    @Autowired
    private ReportRunService reportRunService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EmailSender emailSender;

    @Autowired
    private SmtpServerService smtpServerService;

    /**
     * Called by the Quartz scheduler when a request is made to interrupt this job.
     * Sets the interrupted flag so that execution checks can detect it and abort.
     */
    @Override
    public void interrupt() throws UnableToInterruptJobException {
        log.info("Interrupt requested for ReportJobRunner");
        this.interrupted = true;
    }

    /**
     * Checks whether the job has been interrupted and throws a JobExecutionException if so.
     * Should be called at key points during execution to allow early termination.
     */
    private void checkInterrupted() throws JobExecutionException {
        if (interrupted) {
            throw new JobExecutionException("Job execution was cancelled");
        }
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        String jobIdStr = context.getJobDetail().getJobDataMap().getString(JOB_ID_KEY);
        Long jobId = Long.valueOf(jobIdStr);
        log.info("ReportJobRunner triggered for job id={}", jobId);

        // Step 2: Load JobEntity from DB
        JobEntity job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.error("Job not found with id={}", jobId);
            throw new JobExecutionException("Job not found: " + jobId);
        }

        // Step 3: Validate job is active and report is active
        if (!job.isActive()) {
            log.warn("Job id={} is inactive, skipping execution", jobId);
            return;
        }

        if (job.getReport() == null) {
            log.error("Job id={} has no report assigned", jobId);
            throw new JobExecutionException("Job has no report assigned: " + jobId);
        }

        if (!job.getReport().isActive()) {
            log.warn("Report for job id={} is inactive, skipping execution", jobId);
            return;
        }

        // Step 4: Create JobExecutionEntity with status=RUNNING
        JobExecutionEntity execution = JobExecutionEntity.builder()
                .jobId(jobId)
                .startTime(LocalDateTime.now())
                .status("RUNNING")
                .rowsGenerated(0L)
                .build();
        execution = jobExecutionRepository.save(execution);

        try {
            // Step 5: Resolve parameters from job.parameterValues
            Map<String, String> params = resolveParameters(job.getParameterValues());

            // Check for interruption before pre-run reports
            checkInterrupted();

            // Execute pre-run reports (Update Statement type)
            executePreRunReports(job);

            // Check for interruption before main report execution
            checkInterrupted();

            // Step 6: Execute report via ReportRunService
            RunReportResult result = reportRunService.runReport(job.getReport().getId(), params);

            // Check for interruption before post-run reports
            checkInterrupted();

            // Execute post-run reports
            executePostRunReports(job);

            // Check for interruption before batch file execution
            checkInterrupted();

            // Execute batch file if configured
            executeBatchFile(job, execution.getOutputFile());

            // Step 9: On success — update execution status to SUCCESS
            execution.setStatus("SUCCESS");
            execution.setEndTime(LocalDateTime.now());
            execution.setRowsGenerated((long) result.getRowCount());
            jobExecutionRepository.save(execution);

            log.info("Job id={} completed successfully. Rows generated: {}", jobId, result.getRowCount());

        } catch (Exception e) {
            // Check if this was a cancellation
            if (interrupted) {
                log.info("Job id={} was cancelled", jobId);
                execution.setStatus("CANCELLED");
                execution.setEndTime(LocalDateTime.now());
                execution.setErrorMessage("Job execution was cancelled");
                jobExecutionRepository.save(execution);
                return;
            }

            // Step 9: On failure — update execution status to FAILED
            log.error("Job id={} execution failed: {}", jobId, e.getMessage(), e);

            execution.setStatus("FAILED");
            execution.setEndTime(LocalDateTime.now());
            execution.setErrorMessage(truncateErrorMessage(e.getMessage()));
            jobExecutionRepository.save(execution);

            // Step 11: Send error notification email if configured
            sendErrorNotification(job, e);
        }
    }

    /**
     * Executes pre-run reports configured for the job.
     * These are typically Update Statement reports that set up data before the main report runs.
     * If a pre-run report fails, the error is logged but execution continues.
     */
    private void executePreRunReports(JobEntity job) {
        String preRunIds = job.getPreRunReportIds();
        if (preRunIds == null || preRunIds.isBlank()) {
            return;
        }

        List<Long> reportIds = parseReportIds(preRunIds);
        log.info("Job id={}: executing {} pre-run report(s)", job.getId(), reportIds.size());

        for (Long reportId : reportIds) {
            try {
                log.info("Job id={}: running pre-run report id={}", job.getId(), reportId);
                reportRunService.runReport(reportId, Map.of());
                log.info("Job id={}: pre-run report id={} completed successfully", job.getId(), reportId);
            } catch (Exception e) {
                log.error("Job id={}: pre-run report id={} failed: {}", job.getId(), reportId, e.getMessage(), e);
            }
        }
    }

    /**
     * Executes post-run reports configured for the job.
     * These are typically Update Statement reports that perform cleanup or follow-up actions.
     * If a post-run report fails, the error is logged but execution continues.
     */
    private void executePostRunReports(JobEntity job) {
        String postRunIds = job.getPostRunReportIds();
        if (postRunIds == null || postRunIds.isBlank()) {
            return;
        }

        List<Long> reportIds = parseReportIds(postRunIds);
        log.info("Job id={}: executing {} post-run report(s)", job.getId(), reportIds.size());

        for (Long reportId : reportIds) {
            try {
                log.info("Job id={}: running post-run report id={}", job.getId(), reportId);
                reportRunService.runReport(reportId, Map.of());
                log.info("Job id={}: post-run report id={} completed successfully", job.getId(), reportId);
            } catch (Exception e) {
                log.error("Job id={}: post-run report id={} failed: {}", job.getId(), reportId, e.getMessage(), e);
            }
        }
    }

    /**
     * Parses a comma-separated string of report IDs into a list of Long values.
     * Trims whitespace and skips invalid entries.
     */
    private List<Long> parseReportIds(String commaSeparatedIds) {
        return Arrays.stream(commaSeparatedIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return Long.valueOf(s);
                    } catch (NumberFormatException e) {
                        log.warn("Invalid report ID in pre/post run configuration: '{}'", s);
                        return null;
                    }
                })
                .filter(id -> id != null)
                .toList();
    }

    /**
     * Executes the configured batch file after job completion.
     * The output filename is passed as the first argument to the batch file.
     * If execution fails, the error is logged but does not fail the entire job.
     */
    private void executeBatchFile(JobEntity job, String outputFileName) {
        String batchFile = job.getBatchFile();
        if (batchFile == null || batchFile.isBlank()) {
            return;
        }

        String argument = outputFileName != null ? outputFileName : "";
        log.info("Job id={}: executing batch file '{}' with argument '{}'", job.getId(), batchFile, argument);

        try {
            ProcessBuilder processBuilder = new ProcessBuilder(batchFile, argument);
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            // Read process output for logging
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append(System.lineSeparator());
                }
            }

            int exitCode = process.waitFor();
            if (exitCode == 0) {
                log.info("Job id={}: batch file '{}' completed successfully. Output: {}",
                        job.getId(), batchFile, output.toString().trim());
            } else {
                log.error("Job id={}: batch file '{}' exited with code {}. Output: {}",
                        job.getId(), batchFile, exitCode, output.toString().trim());
            }
        } catch (Exception e) {
            log.error("Job id={}: failed to execute batch file '{}': {}", job.getId(), batchFile, e.getMessage(), e);
        }
    }

    /**
     * Resolves job parameter values from the stored JSON string into a Map suitable for report execution.
     */
    private Map<String, String> resolveParameters(String parameterValuesJson) {
        if (parameterValuesJson == null || parameterValuesJson.isBlank()) {
            return Collections.emptyMap();
        }

        try {
            Map<String, Object> rawParams = objectMapper.readValue(
                    parameterValuesJson, new TypeReference<Map<String, Object>>() {});

            // Convert all values to strings for ReportRunService compatibility
            Map<String, String> stringParams = new java.util.HashMap<>();
            for (Map.Entry<String, Object> entry : rawParams.entrySet()) {
                if (entry.getValue() != null) {
                    stringParams.put(entry.getKey(), entry.getValue().toString());
                }
            }
            return stringParams;
        } catch (Exception e) {
            log.warn("Failed to parse parameter values JSON, using empty params: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }

    /**
     * Sends an error notification email if the job has an error_notification_email configured
     * and an SMTP server is available.
     */
    private void sendErrorNotification(JobEntity job, Exception error) {
        String notificationEmail = job.getErrorNotificationEmail();
        if (notificationEmail == null || notificationEmail.isBlank()) {
            return;
        }

        try {
            // Use the job's configured SMTP server, or fall back to the first active one
            SmtpServerEntity smtp = resolveSmtpServer(job);
            if (smtp == null) {
                log.warn("No SMTP server available for error notification on job id={}", job.getId());
                return;
            }

            String subject = "Job Failed: " + job.getName();
            String body = buildErrorNotificationBody(job, error);

            emailSender.sendEmail(smtp, notificationEmail, null, null,
                    subject, body, null, null, List.of());

            log.info("Error notification sent for job id={} to {}", job.getId(), notificationEmail);

        } catch (MessagingException e) {
            log.error("Failed to send error notification for job id={}: {}", job.getId(), e.getMessage());
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
     * Builds the HTML body for an error notification email.
     */
    private String buildErrorNotificationBody(JobEntity job, Exception error) {
        return "<h3>Job Execution Failed</h3>" +
                "<p><strong>Job Name:</strong> " + escapeHtml(job.getName()) + "</p>" +
                "<p><strong>Job ID:</strong> " + job.getId() + "</p>" +
                "<p><strong>Report:</strong> " + escapeHtml(job.getReport().getName()) + "</p>" +
                "<p><strong>Error:</strong></p>" +
                "<pre>" + escapeHtml(error.getMessage()) + "</pre>";
    }

    /**
     * Truncates error message to fit in the database column (TEXT type, but keep it reasonable).
     */
    private String truncateErrorMessage(String message) {
        if (message == null) {
            return "Unknown error";
        }
        return message.length() > 4000 ? message.substring(0, 4000) : message;
    }

    /**
     * Basic HTML escaping to prevent XSS in error notification emails.
     */
    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
