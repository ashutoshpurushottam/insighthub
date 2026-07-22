package com.insighthub.guardrails;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuardrailsService {

    private final GuardrailsRepository guardrailsRepository;
    private final ReportRepository reportRepository;

    /**
     * Returns the effective guardrails for a report by merging per-report overrides
     * with global defaults. Per-report values take precedence over global defaults.
     * If no per-report override exists, the global config is returned.
     * If no global config exists, a default entity with built-in defaults is returned.
     */
    public GuardrailsConfigEntity getEffectiveGuardrails(Long reportId) {
        GuardrailsConfigEntity global = guardrailsRepository.findGlobal()
                .orElse(GuardrailsConfigEntity.builder().build());

        if (reportId == null) {
            return global;
        }

        Optional<GuardrailsConfigEntity> perReport = guardrailsRepository.findByReportId(reportId);
        if (perReport.isEmpty()) {
            return global;
        }

        GuardrailsConfigEntity override = perReport.get();
        return mergeGuardrails(global, override);
    }

    /**
     * Returns the global guardrails configuration.
     * If none exists, returns a default entity with built-in defaults.
     */
    public GuardrailsConfigEntity getGlobalGuardrails() {
        return guardrailsRepository.findGlobal()
                .orElse(GuardrailsConfigEntity.builder().build());
    }

    /**
     * Creates or updates the global guardrails configuration.
     * Validates all values are positive before saving.
     */
    @Transactional
    public GuardrailsConfigEntity saveGlobalGuardrails(GuardrailsConfigEntity config) {
        validateGuardrailValues(config);

        GuardrailsConfigEntity existing = guardrailsRepository.findGlobal().orElse(null);
        if (existing != null) {
            existing.setMaxRows(config.getMaxRows());
            existing.setMaxExportRows(config.getMaxExportRows());
            existing.setMaxDateRangeDays(config.getMaxDateRangeDays());
            existing.setExecutionTimeoutSeconds(config.getExecutionTimeoutSeconds());
            existing.setMaxConcurrentPerUser(config.getMaxConcurrentPerUser());
            existing.setMaxResultSizeBytes(config.getMaxResultSizeBytes());
            return guardrailsRepository.save(existing);
        }

        config.setId(null);
        config.setReport(null);
        return guardrailsRepository.save(config);
    }

    /**
     * Returns the per-report guardrails override for a specific report.
     */
    public Optional<GuardrailsConfigEntity> getPerReportGuardrails(Long reportId) {
        return guardrailsRepository.findByReportId(reportId);
    }

    /**
     * Creates or updates the per-report guardrails override.
     * Validates that the report exists and all values are positive.
     */
    @Transactional
    public GuardrailsConfigEntity savePerReportGuardrails(Long reportId, GuardrailsConfigEntity config) {
        validateGuardrailValues(config);

        ReportEntity report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        GuardrailsConfigEntity existing = guardrailsRepository.findByReportId(reportId).orElse(null);
        if (existing != null) {
            existing.setMaxRows(config.getMaxRows());
            existing.setMaxExportRows(config.getMaxExportRows());
            existing.setMaxDateRangeDays(config.getMaxDateRangeDays());
            existing.setExecutionTimeoutSeconds(config.getExecutionTimeoutSeconds());
            existing.setMaxConcurrentPerUser(config.getMaxConcurrentPerUser());
            existing.setMaxResultSizeBytes(config.getMaxResultSizeBytes());
            return guardrailsRepository.save(existing);
        }

        config.setId(null);
        config.setReport(report);
        return guardrailsRepository.save(config);
    }

    /**
     * Deletes the per-report guardrails override for a specific report,
     * reverting it to global defaults.
     */
    @Transactional
    public void deletePerReportGuardrails(Long reportId) {
        guardrailsRepository.findByReportId(reportId)
                .ifPresent(guardrailsRepository::delete);
    }

    /**
     * Merges per-report override values on top of global defaults.
     * Per-report values always take precedence.
     */
    private GuardrailsConfigEntity mergeGuardrails(GuardrailsConfigEntity global, GuardrailsConfigEntity perReport) {
        return GuardrailsConfigEntity.builder()
                .id(perReport.getId())
                .report(perReport.getReport())
                .maxRows(perReport.getMaxRows())
                .maxExportRows(perReport.getMaxExportRows())
                .maxDateRangeDays(perReport.getMaxDateRangeDays())
                .executionTimeoutSeconds(perReport.getExecutionTimeoutSeconds())
                .maxConcurrentPerUser(perReport.getMaxConcurrentPerUser())
                .maxResultSizeBytes(perReport.getMaxResultSizeBytes())
                .build();
    }

    /**
     * Validates that all guardrail values are positive integers/longs.
     * Throws IllegalArgumentException if any value is not positive.
     */
    private void validateGuardrailValues(GuardrailsConfigEntity config) {
        if (config.getMaxRows() <= 0) {
            throw new IllegalArgumentException("maxRows must be a positive integer");
        }
        if (config.getMaxExportRows() <= 0) {
            throw new IllegalArgumentException("maxExportRows must be a positive integer");
        }
        if (config.getMaxDateRangeDays() <= 0) {
            throw new IllegalArgumentException("maxDateRangeDays must be a positive integer");
        }
        if (config.getExecutionTimeoutSeconds() <= 0) {
            throw new IllegalArgumentException("executionTimeoutSeconds must be a positive integer");
        }
        if (config.getMaxConcurrentPerUser() <= 0) {
            throw new IllegalArgumentException("maxConcurrentPerUser must be a positive integer");
        }
        if (config.getMaxResultSizeBytes() <= 0) {
            throw new IllegalArgumentException("maxResultSizeBytes must be a positive long");
        }
    }
}
