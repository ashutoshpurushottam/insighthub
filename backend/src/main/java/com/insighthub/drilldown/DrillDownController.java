package com.insighthub.drilldown;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DrillDownController {

    private final DrillDownService drillDownService;

    /**
     * GET /api/reports/{id}/drill-downs — return configured drill-down links with mappings.
     * Accessible to any authenticated user viewing the report.
     */
    @GetMapping("/reports/{id}/drill-downs")
    public ResponseEntity<List<DrillDownLinkDto>> getDrillDownLinks(@PathVariable Long id) {
        List<DrillDownLinkEntity> links = drillDownService.getDrillDownLinks(id);
        return ResponseEntity.ok(DrillDownLinkDto.fromEntities(links));
    }

    /**
     * POST /api/reports/{id}/drill-downs — create a new drill-down link (Admin only).
     */
    @PostMapping("/reports/{id}/drill-downs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DrillDownLinkDto> createDrillDownLink(
            @PathVariable Long id,
            @RequestBody CreateDrillDownRequest request) {
        DrillDownLinkEntity created = drillDownService.createDrillDownLink(
                id,
                request.getChildReportId(),
                request.getTriggerColumn(),
                request.getPosition(),
                request.getParamMappings()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(DrillDownLinkDto.fromEntity(created));
    }

    /**
     * DELETE /api/drill-downs/{id} — remove a drill-down link (Admin only).
     */
    @DeleteMapping("/drill-downs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDrillDownLink(@PathVariable Long id) {
        drillDownService.deleteDrillDownLink(id);
        return ResponseEntity.noContent().build();
    }
}
