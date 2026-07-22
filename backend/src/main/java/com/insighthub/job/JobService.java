package com.insighthub.job;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.job.scheduler.JobSchedulerService;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.ReportRepository;
import com.insighthub.smtp.SmtpServerEntity;
import com.insighthub.smtp.SmtpServerService;
import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobService {

    private static final Logger log = LoggerFactory.getLogger(JobService.class);

    private final JobRepository jobRepository;
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final SmtpServerService smtpServerService;
    private final JobSchedulerService jobSchedulerService;
    private final JobExecutionRepository jobExecutionRepository;
    private final ObjectMapper objectMapper;
    private final Scheduler scheduler;

    /**
     * Get all jobs owned by a specific user.
     */
    public List<JobDto> getAllJobsForUser(Long userId) {
        return jobRepository.findByOwnerUserId(userId).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Get all jobs (for admin or listing views).
     */
    public List<JobDto> getAllJobs() {
        return jobRepository.findAll().stream().map(this::toDto).toList();
    }

    /**
     * Get all shared jobs visible to the current authenticated user.
     * Returns jobs where allowSharing=true that the user has access to view.
     *
     * TODO: Once a proper job access rights table is implemented, filter results
     * based on the current user's granted access rights. Currently returns all
     * jobs with allowSharing=true for any authenticated user.
     *
     * TODO (Splitting): When allowSplitting=true and the Rules feature (Phase 3) is available,
     * apply rule values per shared user so each user receives different output.
     * For now, splitting is stubbed — shared users see the same full output regardless
     * of the allowSplitting flag.
     */
    public List<JobDto> getSharedJobs(Long currentUserId) {
        List<JobEntity> sharedJobs = jobRepository.findByAllowSharingTrue();

        // Exclude jobs owned by the current user (they already see their own jobs)
        return sharedJobs.stream()
                .filter(job -> job.getOwner() == null || !job.getOwner().getId().equals(currentUserId))
                .map(this::toDto)
                .toList();
    }

    /**
     * Get a single job by ID. Throws ResourceNotFoundException if not found.
     */
    public JobDto getById(Long id) {
        JobEntity entity = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));
        return toDto(entity);
    }

    /**
     * Legacy method for backward compatibility with existing controller.
     */
    public JobDto getJobById(Long id) {
        return getById(id);
    }

    /**
     * Create a new job. Validates that the report exists and SMTP server exists if specified.
     */
    @Transactional
    public JobDto createJob(CreateJobRequest request, Long ownerUserId) {
        // Validate report exists
        ReportEntity report = reportRepository.findById(request.getReportId())
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", request.getReportId()));

        // Validate owner exists
        UserEntity owner = userRepository.findById(ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", ownerUserId));

        // Validate SMTP server exists if specified
        SmtpServerEntity smtpServer = null;
        if (request.getSmtpServerId() != null) {
            smtpServer = smtpServerService.getById(request.getSmtpServerId());
        }

        // Convert parameterValues map to JSON string
        String parameterValuesJson = serializeParameterValues(request.getParameterValues());

        JobEntity entity = JobEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .report(report)
                .jobType(request.getJobType())
                .outputFormat(request.getOutputFormat())
                .active(request.isActive())
                .owner(owner)
                // Schedule fields
                .cronSecond(request.getCronSecond())
                .cronMinute(request.getCronMinute())
                .cronHour(request.getCronHour())
                .cronDay(request.getCronDay())
                .cronMonth(request.getCronMonth())
                .cronWeekday(request.getCronWeekday())
                .cronYear(request.getCronYear())
                .timeZone(request.getTimeZone())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .extraSchedules(request.getExtraSchedules())
                .manual(request.isManual())
                // Email fields
                .emailTo(request.getEmailTo())
                .emailCc(request.getEmailCc())
                .emailBcc(request.getEmailBcc())
                .emailReplyTo(request.getEmailReplyTo())
                .emailFrom(request.getEmailFrom())
                .emailSubject(request.getEmailSubject())
                .emailMessage(request.getEmailMessage())
                .smtpServer(smtpServer)
                .dynamicRecipientsReportId(request.getDynamicRecipientsReportId())
                // Publish/Archive fields
                .runsToArchive(request.getRunsToArchive())
                .allowSharing(request.isAllowSharing())
                .allowSplitting(request.isAllowSplitting())
                .fixedFileName(request.getFixedFileName())
                .subDirectory(request.getSubDirectory())
                // Pre/Post actions
                .preRunReportIds(request.getPreRunReportIds())
                .postRunReportIds(request.getPostRunReportIds())
                .batchFile(request.getBatchFile())
                // Error handling
                .errorNotificationEmail(request.getErrorNotificationEmail())
                // Parameters
                .parameterValues(parameterValuesJson)
                .build();

        JobEntity savedEntity = jobRepository.save(entity);

        // Schedule with Quartz if active and not manual
        if (savedEntity.isActive() && !savedEntity.isManual()) {
            try {
                jobSchedulerService.scheduleJob(savedEntity);
            } catch (SchedulerException e) {
                log.warn("Failed to schedule job '{}' (id={}): {}",
                        savedEntity.getName(), savedEntity.getId(), e.getMessage());
            }
        }

        return toDto(savedEntity);
    }

    /**
     * Legacy overload — creates a job using username lookup (backward compatibility with existing controller).
     */
    @Transactional
    public JobDto createJob(JobRequest request, String createdBy) {
        UserEntity owner = userRepository.findByUsername(createdBy)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", createdBy));

        ReportEntity report = reportRepository.findById(request.getReportId())
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", request.getReportId()));

        JobType type = JobType.valueOf(request.getJobType());

        JobEntity entity = JobEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .report(report)
                .jobType(type)
                .outputFormat(request.getOutputFormat())
                .active(request.isActive())
                .owner(owner)
                .build();

        JobEntity savedEntity = jobRepository.save(entity);

        // Schedule with Quartz if active and not manual
        if (savedEntity.isActive() && !savedEntity.isManual()) {
            try {
                jobSchedulerService.scheduleJob(savedEntity);
            } catch (SchedulerException e) {
                log.warn("Failed to schedule job '{}' (id={}): {}",
                        savedEntity.getName(), savedEntity.getId(), e.getMessage());
            }
        }

        return toDto(savedEntity);
    }

    /**
     * Update an existing job. Validates ownership (or admin access), report exists, and SMTP server if specified.
     */
    @Transactional
    public JobDto updateJob(Long id, CreateJobRequest request) {
        JobEntity entity = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));

        // Validate ownership or admin access
        validateOwnershipOrAdmin(entity);

        // Validate report exists
        ReportEntity report = reportRepository.findById(request.getReportId())
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", request.getReportId()));

        // Validate SMTP server exists if specified
        SmtpServerEntity smtpServer = null;
        if (request.getSmtpServerId() != null) {
            smtpServer = smtpServerService.getById(request.getSmtpServerId());
        }

        // Convert parameterValues map to JSON string
        String parameterValuesJson = serializeParameterValues(request.getParameterValues());

        // Update entity fields
        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setReport(report);
        entity.setJobType(request.getJobType());
        entity.setOutputFormat(request.getOutputFormat());
        entity.setActive(request.isActive());
        // Schedule fields
        entity.setCronSecond(request.getCronSecond());
        entity.setCronMinute(request.getCronMinute());
        entity.setCronHour(request.getCronHour());
        entity.setCronDay(request.getCronDay());
        entity.setCronMonth(request.getCronMonth());
        entity.setCronWeekday(request.getCronWeekday());
        entity.setCronYear(request.getCronYear());
        entity.setTimeZone(request.getTimeZone());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setExtraSchedules(request.getExtraSchedules());
        entity.setManual(request.isManual());
        // Email fields
        entity.setEmailTo(request.getEmailTo());
        entity.setEmailCc(request.getEmailCc());
        entity.setEmailBcc(request.getEmailBcc());
        entity.setEmailReplyTo(request.getEmailReplyTo());
        entity.setEmailFrom(request.getEmailFrom());
        entity.setEmailSubject(request.getEmailSubject());
        entity.setEmailMessage(request.getEmailMessage());
        entity.setSmtpServer(smtpServer);
        entity.setDynamicRecipientsReportId(request.getDynamicRecipientsReportId());
        // Publish/Archive fields
        entity.setRunsToArchive(request.getRunsToArchive());
        entity.setAllowSharing(request.isAllowSharing());
        entity.setAllowSplitting(request.isAllowSplitting());
        entity.setFixedFileName(request.getFixedFileName());
        entity.setSubDirectory(request.getSubDirectory());
        // Pre/Post actions
        entity.setPreRunReportIds(request.getPreRunReportIds());
        entity.setPostRunReportIds(request.getPostRunReportIds());
        entity.setBatchFile(request.getBatchFile());
        // Error handling
        entity.setErrorNotificationEmail(request.getErrorNotificationEmail());
        // Parameters
        entity.setParameterValues(parameterValuesJson);

        JobEntity updatedEntity = jobRepository.save(entity);

        // Update Quartz schedule: reschedule if active & not manual, unschedule otherwise
        try {
            if (updatedEntity.isActive() && !updatedEntity.isManual()) {
                jobSchedulerService.rescheduleJob(updatedEntity);
            } else {
                jobSchedulerService.unscheduleJob(updatedEntity.getId());
            }
        } catch (SchedulerException e) {
            log.warn("Failed to update schedule for job '{}' (id={}): {}",
                    updatedEntity.getName(), updatedEntity.getId(), e.getMessage());
        }

        return toDto(updatedEntity);
    }

    /**
     * Legacy overload for backward compatibility with existing controller.
     */
    @Transactional
    public JobDto updateJob(Long id, JobRequest request, String updatedBy) {
        JobEntity entity = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setJobType(JobType.valueOf(request.getJobType()));
        entity.setOutputFormat(request.getOutputFormat());
        entity.setActive(request.isActive());

        if (request.getReportId() != null) {
            entity.setReport(reportRepository.findById(request.getReportId()).orElse(null));
        }

        JobEntity updatedEntity = jobRepository.save(entity);

        // Update Quartz schedule: reschedule if active & not manual, unschedule otherwise
        try {
            if (updatedEntity.isActive() && !updatedEntity.isManual()) {
                jobSchedulerService.rescheduleJob(updatedEntity);
            } else {
                jobSchedulerService.unscheduleJob(updatedEntity.getId());
            }
        } catch (SchedulerException e) {
            log.warn("Failed to update schedule for job '{}' (id={}): {}",
                    updatedEntity.getName(), updatedEntity.getId(), e.getMessage());
        }

        return toDto(updatedEntity);
    }

    /**
     * Delete a job. Validates ownership or admin access.
     * Unschedules from Quartz before deleting from database.
     */
    @Transactional
    public void deleteJob(Long id) {
        JobEntity entity = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));

        validateOwnershipOrAdmin(entity);

        // Unschedule from Quartz before deleting
        try {
            jobSchedulerService.unscheduleJob(id);
        } catch (SchedulerException e) {
            log.warn("Failed to unschedule job (id={}) during deletion: {}", id, e.getMessage());
        }

        jobRepository.delete(entity);
    }

    /**
     * Execute a job immediately (manual trigger).
     * <p>
     * Creates a JobExecutionEntity with status "RUNNING" and triggers the job
     * asynchronously via Quartz's thread pool. Returns immediately with the
     * execution ID so the caller can track progress.
     * </p>
     */
    @Transactional
    public JobRunResult executeJob(Long id) {
        JobEntity job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", id));

        try {
            // Trigger the job via Quartz's thread pool — this runs asynchronously
            // The ReportJobRunner will create its own execution record and handle
            // the full pipeline (pre-run, report execution, handler delegation, post-run)
            jobSchedulerService.triggerJobNow(job);

            return new JobRunResult(true,
                    "Job '" + job.getName() + "' has been triggered for execution.",
                    0, null);
        } catch (SchedulerException e) {
            log.error("Failed to trigger job id={}: {}", id, e.getMessage(), e);
            return new JobRunResult(false,
                    "Failed to trigger job: " + e.getMessage(),
                    0, null);
        }
    }

    /**
     * Cancel a currently running job.
     * <p>
     * Finds the RUNNING execution for this job, interrupts the Quartz job thread,
     * and updates the execution status to CANCELLED.
     * </p>
     *
     * @param jobId the ID of the job to cancel
     * @return a JobRunResult indicating whether cancellation was successful
     */
    @Transactional
    public JobRunResult cancelJob(Long jobId) {
        JobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        // Find the currently RUNNING execution for this job
        var runningExecution = jobExecutionRepository.findByJobIdAndStatus(jobId, "RUNNING");
        if (runningExecution.isEmpty()) {
            return new JobRunResult(false,
                    "No running execution found for job '" + job.getName() + "'.",
                    0, null);
        }

        // Interrupt the Quartz job thread
        JobKey jobKey = new JobKey("job-" + jobId, "report-jobs");
        try {
            boolean interrupted = scheduler.interrupt(jobKey);
            if (!interrupted) {
                log.warn("Scheduler could not interrupt job id={} — it may have already finished", jobId);
            }
        } catch (Exception e) {
            log.error("Failed to interrupt job id={}: {}", jobId, e.getMessage(), e);
        }

        // Update execution status to CANCELLED
        JobExecutionEntity execution = runningExecution.get();
        execution.setStatus("CANCELLED");
        execution.setEndTime(java.time.LocalDateTime.now());
        execution.setErrorMessage("Job was cancelled by user");
        jobExecutionRepository.save(execution);

        log.info("Job id={} cancelled successfully", jobId);
        return new JobRunResult(true,
                "Job '" + job.getName() + "' has been cancelled.",
                0, execution.getId());
    }

    // ======================== Private helpers ========================

    /**
     * Validates that the current authenticated user is either the owner of the job
     * or has admin access (accessLevel >= 10).
     */
    private void validateOwnershipOrAdmin(JobEntity job) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new AccessDeniedException("Not authenticated");
        }

        String currentUsername = authentication.getName();
        UserEntity currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new AccessDeniedException("User not found"));

        // Admin users (accessLevel >= 10) can modify any job
        if (currentUser.getAccessLevel() >= 10) {
            return;
        }

        // Check ownership
        if (job.getOwner() != null && !job.getOwner().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You do not have permission to modify this job");
        }
    }

    /**
     * Serialize parameterValues Map to JSON string for storage.
     */
    private String serializeParameterValues(Map<String, Object> parameterValues) {
        if (parameterValues == null || parameterValues.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(parameterValues);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize parameter values: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid parameter values format");
        }
    }

    /**
     * Deserialize JSON string back to parameterValues Map.
     */
    private Map<String, Object> deserializeParameterValues(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize parameter values: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }

    private JobDto toDto(JobEntity e) {
        return JobDto.builder()
                .id(e.getId())
                .name(e.getName())
                .description(e.getDescription())
                .reportId(e.getReport() != null ? e.getReport().getId() : null)
                .reportName(e.getReport() != null ? e.getReport().getName() : null)
                .jobType(e.getJobType() != null ? e.getJobType().name() : null)
                .outputFormat(e.getOutputFormat())
                .active(e.isActive())
                .ownerUserId(e.getOwner() != null ? e.getOwner().getId() : null)
                .ownerUsername(e.getOwner() != null ? e.getOwner().getUsername() : null)
                // Schedule fields
                .cronSecond(e.getCronSecond())
                .cronMinute(e.getCronMinute())
                .cronHour(e.getCronHour())
                .cronDay(e.getCronDay())
                .cronMonth(e.getCronMonth())
                .cronWeekday(e.getCronWeekday())
                .cronYear(e.getCronYear())
                .timeZone(e.getTimeZone())
                .startDate(e.getStartDate())
                .endDate(e.getEndDate())
                .extraSchedules(e.getExtraSchedules())
                .manual(e.isManual())
                // Email fields
                .emailTo(e.getEmailTo())
                .emailCc(e.getEmailCc())
                .emailBcc(e.getEmailBcc())
                .emailReplyTo(e.getEmailReplyTo())
                .emailFrom(e.getEmailFrom())
                .emailSubject(e.getEmailSubject())
                .emailMessage(e.getEmailMessage())
                .smtpServerId(e.getSmtpServer() != null ? e.getSmtpServer().getId() : null)
                .smtpServerName(e.getSmtpServer() != null ? e.getSmtpServer().getName() : null)
                .dynamicRecipientsReportId(e.getDynamicRecipientsReportId())
                // Publish/Archive fields
                .runsToArchive(e.getRunsToArchive())
                .allowSharing(e.isAllowSharing())
                .allowSplitting(e.isAllowSplitting())
                .fixedFileName(e.getFixedFileName())
                .subDirectory(e.getSubDirectory())
                // Pre/Post actions
                .preRunReportIds(e.getPreRunReportIds())
                .postRunReportIds(e.getPostRunReportIds())
                .batchFile(e.getBatchFile())
                // Error handling
                .errorNotificationEmail(e.getErrorNotificationEmail())
                // Parameters
                .parameterValues(deserializeParameterValues(e.getParameterValues()))
                // Timestamps
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
