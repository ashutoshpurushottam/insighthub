package com.insighthub.job;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('schedule_jobs') or hasAuthority('configure_jobs') or hasRole('ADMIN')")
public class JobController {

    private final JobService jobService;
    private final JobExecutionRepository jobExecutionRepository;
    private final JobArchiveRepository jobArchiveRepository;
    private final UserRepository userRepository;

    /**
     * GET /api/jobs — List all jobs for current user.
     */
    @GetMapping
    public ResponseEntity<List<JobDto>> getAllJobs(@AuthenticationPrincipal UserDetails currentUser) {
        UserEntity user = resolveUser(currentUser.getUsername());
        // Admin users see all jobs; regular users see only their own
        if (user.getAccessLevel() >= 10) {
            return ResponseEntity.ok(jobService.getAllJobs());
        }
        return ResponseEntity.ok(jobService.getAllJobsForUser(user.getId()));
    }

    /**
     * GET /api/jobs/shared — List jobs shared with the current user.
     * Returns jobs where allowSharing=true that are owned by other users.
     *
     * TODO: Once a job access rights table is implemented, this endpoint should
     * verify that the current user has been explicitly granted access to view each job.
     * Currently, all authenticated users can see jobs with allowSharing=true.
     *
     * TODO (Splitting): When the Rules feature (Phase 3) is available and allowSplitting=true
     * on a shared job, apply rule values per shared user so each gets different output.
     * For now, splitting is not applied — all shared users see the same output.
     */
    @GetMapping("/shared")
    public ResponseEntity<List<JobDto>> getSharedJobs(@AuthenticationPrincipal UserDetails currentUser) {
        UserEntity user = resolveUser(currentUser.getUsername());
        return ResponseEntity.ok(jobService.getSharedJobs(user.getId()));
    }

    /**
     * GET /api/jobs/{id} — Get job details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobDto> getJobById(@PathVariable Long id) {
        return ResponseEntity.ok(jobService.getById(id));
    }

    /**
     * POST /api/jobs — Create a new job.
     */
    @PostMapping
    public ResponseEntity<JobDto> createJob(
            @Valid @RequestBody CreateJobRequest request,
            @AuthenticationPrincipal UserDetails currentUser) {
        UserEntity user = resolveUser(currentUser.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(jobService.createJob(request, user.getId()));
    }

    /**
     * PUT /api/jobs/{id} — Update an existing job.
     */
    @PutMapping("/{id}")
    public ResponseEntity<JobDto> updateJob(
            @PathVariable Long id,
            @Valid @RequestBody CreateJobRequest request) {
        return ResponseEntity.ok(jobService.updateJob(id, request));
    }

    /**
     * DELETE /api/jobs/{id} — Delete a job.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/jobs/{id}/run — Run a job immediately (manual trigger).
     * Returns HTTP 202 Accepted since execution happens asynchronously via Quartz.
     */
    @PostMapping("/{id}/run")
    public ResponseEntity<JobRunResult> runJob(@PathVariable Long id) {
        JobRunResult result = jobService.executeJob(id);
        if (result.isSuccess()) {
            return ResponseEntity.accepted().body(result);
        }
        return ResponseEntity.internalServerError().body(result);
    }

    /**
     * POST /api/jobs/{id}/cancel — Cancel a running job.
     * Interrupts the running thread and updates execution status to CANCELLED.
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<JobRunResult> cancelJob(@PathVariable Long id) {
        JobRunResult result = jobService.cancelJob(id);
        if (result.isSuccess()) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(result);
    }

    /**
     * GET /api/jobs/{id}/history — Get execution history for a job.
     */
    @GetMapping("/{id}/history")
    public ResponseEntity<List<JobExecutionEntity>> getJobHistory(@PathVariable Long id) {
        // Verify job exists
        jobService.getById(id);
        List<JobExecutionEntity> history = jobExecutionRepository.findByJobIdOrderByStartTimeDesc(id);
        return ResponseEntity.ok(history);
    }

    /**
     * GET /api/jobs/{id}/archives — Get archived outputs for a job.
     */
    @GetMapping("/{id}/archives")
    public ResponseEntity<List<JobArchiveEntity>> getJobArchives(@PathVariable Long id) {
        // Verify job exists
        jobService.getById(id);
        List<JobArchiveEntity> archives = jobArchiveRepository.findByJobIdOrderByCreatedAtDesc(id);
        return ResponseEntity.ok(archives);
    }

    /**
     * GET /api/jobs/{id}/archives/{archiveId}/download — Download an archive file.
     */
    @GetMapping("/{id}/archives/{archiveId}/download")
    public ResponseEntity<Resource> downloadArchive(
            @PathVariable Long id,
            @PathVariable Long archiveId) {
        // Verify job exists
        jobService.getById(id);

        JobArchiveEntity archive = jobArchiveRepository.findById(archiveId)
                .orElseThrow(() -> new ResourceNotFoundException("JobArchive", "id", archiveId));

        // Verify archive belongs to this job
        if (!archive.getJobId().equals(id)) {
            throw new ResourceNotFoundException("JobArchive", "id", archiveId);
        }

        File file = new File(archive.getFilePath());
        if (!file.exists()) {
            throw new ResourceNotFoundException("ArchiveFile", "path", archive.getFilePath());
        }

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + archive.getFileName() + "\"")
                .body(resource);
    }

    /**
     * GET /api/jobs/running — List currently running jobs.
     * Stub: will be fully implemented in task 6.5.
     */
    @GetMapping("/running")
    public ResponseEntity<List<JobExecutionEntity>> getRunningJobs() {
        List<JobExecutionEntity> runningJobs = jobExecutionRepository.findByStatus("RUNNING");
        return ResponseEntity.ok(runningJobs);
    }

    // ======================== Private helpers ========================

    private UserEntity resolveUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }
}
