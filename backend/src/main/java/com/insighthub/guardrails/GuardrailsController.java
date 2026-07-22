package com.insighthub.guardrails;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GuardrailsController {

    private final GuardrailsService guardrailsService;

    /**
     * GET /api/guardrails — return global guardrails configuration.
     * Accessible to any authenticated user (Admin page will consume this).
     */
    @GetMapping("/guardrails")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GuardrailsConfigEntity> getGlobalGuardrails() {
        return ResponseEntity.ok(guardrailsService.getGlobalGuardrails());
    }

    /**
     * PUT /api/guardrails — update global guardrails configuration (Admin only).
     * Validates all values are positive integers/longs.
     */
    @PutMapping("/guardrails")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GuardrailsConfigEntity> updateGlobalGuardrails(
            @RequestBody GuardrailsConfigEntity config) {
        return ResponseEntity.ok(guardrailsService.saveGlobalGuardrails(config));
    }

    /**
     * PUT /api/reports/{id}/guardrails — set per-report guardrails override (Admin only).
     * Creates or updates the per-report override for the given report.
     */
    @PutMapping("/reports/{id}/guardrails")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GuardrailsConfigEntity> setPerReportGuardrails(
            @PathVariable Long id,
            @RequestBody GuardrailsConfigEntity config) {
        return ResponseEntity.ok(guardrailsService.savePerReportGuardrails(id, config));
    }
}
