package com.insighthub.job.handlers;

import com.insighthub.job.JobArchiveEntity;
import com.insighthub.job.JobArchiveRepository;
import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.job.scheduler.JobOutputHandler;
import com.insighthub.report.RunReportResult;
import com.insighthub.smtp.EmailSender;
import com.insighthub.smtp.SmtpServerEntity;
import com.insighthub.smtp.SmtpServerService;
import jakarta.mail.MessagingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;

/**
 * Job output handler that publishes report results as a file to the export directory.
 * <p>
 * This handler:
 * <ol>
 *   <li>Generates a file from the report result based on the job's output format</li>
 *   <li>Writes the file to the configured export directory (with optional sub-directory)</li>
 *   <li>Creates a {@link JobArchiveEntity} record for the generated file</li>
 *   <li>Prunes old archives if the job's runsToArchive limit is exceeded</li>
 *   <li>Sends a notification email to recipients if emailTo is configured</li>
 * </ol>
 * </p>
 *
 * <p>Implements Requirement 5: Job Types — Publish</p>
 * <p>Implements Requirement 9: Job Archives & Shared Jobs (archive retention)</p>
 */
@Component
public class PublishHandler implements JobOutputHandler {

    private static final Logger log = LoggerFactory.getLogger(PublishHandler.class);

    private final ReportResultFileGenerator fileGenerator;
    private final JobArchiveRepository jobArchiveRepository;
    private final EmailSender emailSender;
    private final SmtpServerService smtpServerService;
    private final String exportDirectory;

    public PublishHandler(
            ReportResultFileGenerator fileGenerator,
            JobArchiveRepository jobArchiveRepository,
            EmailSender emailSender,
            SmtpServerService smtpServerService,
            @Value("${insighthub.export.directory:./exports}") String exportDirectory) {
        this.fileGenerator = fileGenerator;
        this.jobArchiveRepository = jobArchiveRepository;
        this.emailSender = emailSender;
        this.smtpServerService = smtpServerService;
        this.exportDirectory = exportDirectory;
    }

    @Override
    public JobHandlerResult handle(JobEntity job, JobExecutionEntity execution, RunReportResult result) {
        log.info("PublishHandler processing job id={}, report rows={}", job.getId(), result.getRowCount());

        try {
            // Step 1: Generate file from report result
            String outputFormat = job.getOutputFormat() != null ? job.getOutputFormat() : "CSV";
            String reportName = job.getReport() != null ? job.getReport().getName() : job.getName();

            ReportResultFileGenerator.GeneratedFile generatedFile =
                    fileGenerator.generate(result, outputFormat, reportName);

            // Step 2: Determine the output filename
            String filename = resolveFilename(job, generatedFile.filename());

            // Step 3: Determine the output path and write file to disk
            Path outputPath = resolveOutputPath(job, filename);
            Files.createDirectories(outputPath.getParent());
            Files.write(outputPath, generatedFile.data());

            String filePath = outputPath.toString();
            long fileSize = generatedFile.data().length;

            log.info("Published file '{}' ({} bytes) for job id={}", filePath, fileSize, job.getId());

            // Step 4: Create archive record
            JobArchiveEntity archive = JobArchiveEntity.builder()
                    .jobId(job.getId())
                    .executionId(execution.getId())
                    .filePath(filePath)
                    .fileName(filename)
                    .fileSize(fileSize)
                    .build();
            jobArchiveRepository.save(archive);

            // Step 5: Prune old archives if runsToArchive is configured
            pruneOldArchives(job);

            // Step 6: Send notification email if To field is configured
            sendNotificationEmail(job, filename, filePath);

            return JobHandlerResult.success(filePath,
                    "File published: " + filename + " (" + fileSize + " bytes)");

        } catch (IOException e) {
            log.error("Failed to write published file for job id={}: {}", job.getId(), e.getMessage(), e);
            return JobHandlerResult.failure("File write failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error in PublishHandler for job id={}: {}", job.getId(), e.getMessage(), e);
            return JobHandlerResult.failure("Unexpected error: " + e.getMessage());
        }
    }

    /**
     * Resolves the filename to use for the published file.
     * Uses fixedFileName from the job if configured, otherwise uses the generated filename.
     *
     * @param job               the job entity
     * @param generatedFilename the filename produced by the file generator
     * @return the resolved filename
     */
    private String resolveFilename(JobEntity job, String generatedFilename) {
        if (job.getFixedFileName() != null && !job.getFixedFileName().isBlank()) {
            return job.getFixedFileName();
        }
        return generatedFilename;
    }

    /**
     * Resolves the full output path for the published file.
     * Path structure: {exportDirectory}/{job.subDirectory}/{filename}
     *
     * @param job      the job entity
     * @param filename the filename to use
     * @return the resolved Path
     */
    private Path resolveOutputPath(JobEntity job, String filename) {
        Path basePath = Paths.get(exportDirectory);

        if (job.getSubDirectory() != null && !job.getSubDirectory().isBlank()) {
            basePath = basePath.resolve(job.getSubDirectory());
        }

        return basePath.resolve(filename);
    }

    /**
     * Prunes old archive records and their associated files if the job has a runsToArchive limit.
     * Keeps only the N most recent archives, deleting older ones from both the database and disk.
     *
     * @param job the job entity
     */
    private void pruneOldArchives(JobEntity job) {
        if (job.getRunsToArchive() == null || job.getRunsToArchive() <= 0) {
            return;
        }

        List<JobArchiveEntity> archives = jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(job.getId());

        if (archives.size() <= job.getRunsToArchive()) {
            return;
        }

        // Archives beyond the limit (already sorted desc by createdAt, so skip the first N)
        List<JobArchiveEntity> toDelete = archives.subList(job.getRunsToArchive(), archives.size());

        for (JobArchiveEntity oldArchive : toDelete) {
            // Delete the file from disk
            try {
                Path oldFilePath = Paths.get(oldArchive.getFilePath());
                Files.deleteIfExists(oldFilePath);
                log.debug("Deleted old archive file: {}", oldArchive.getFilePath());
            } catch (IOException e) {
                log.warn("Failed to delete old archive file '{}': {}", oldArchive.getFilePath(), e.getMessage());
            }

            // Delete the archive record from DB
            jobArchiveRepository.delete(oldArchive);
        }

        log.info("Pruned {} old archive(s) for job id={}, keeping {} most recent",
                toDelete.size(), job.getId(), job.getRunsToArchive());
    }

    /**
     * Sends a notification email to recipients if the job's emailTo field is configured.
     * The email informs recipients that the report file is ready.
     *
     * @param job      the job entity
     * @param filename the published filename
     * @param filePath the full path of the published file
     */
    private void sendNotificationEmail(JobEntity job, String filename, String filePath) {
        if (job.getEmailTo() == null || job.getEmailTo().isBlank()) {
            return;
        }

        SmtpServerEntity smtp = resolveSmtpServer(job);
        if (smtp == null) {
            log.warn("No SMTP server available to send notification for job id={}", job.getId());
            return;
        }

        String subject = job.getEmailSubject() != null ? job.getEmailSubject()
                : "Report Published: " + job.getName();
        String body = job.getEmailMessage() != null ? job.getEmailMessage()
                : buildDefaultNotificationBody(job, filename);

        try {
            emailSender.sendEmail(
                    smtp,
                    job.getEmailTo(),
                    job.getEmailCc(),
                    job.getEmailBcc(),
                    subject,
                    body,
                    job.getEmailFrom(),
                    job.getEmailReplyTo(),
                    Collections.emptyList()
            );
            log.info("Notification email sent for job id={} to: {}", job.getId(), job.getEmailTo());
        } catch (MessagingException e) {
            log.warn("Failed to send notification email for job id={}: {}", job.getId(), e.getMessage());
        }
    }

    /**
     * Builds a default notification email body when no custom message is configured.
     */
    private String buildDefaultNotificationBody(JobEntity job, String filename) {
        return "<p>The scheduled report <strong>" + job.getName() + "</strong> has been published.</p>"
                + "<p>File: " + filename + "</p>"
                + "<p>The file is available for download from the Jobs page.</p>";
    }

    /**
     * Resolves the SMTP server to use for sending notifications.
     * Uses the job's configured SMTP server if active, otherwise falls back to the first active server.
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
