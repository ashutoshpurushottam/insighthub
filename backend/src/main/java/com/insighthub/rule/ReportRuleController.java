package com.insighthub.rule;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports/{reportId}/rules")
@RequiredArgsConstructor
public class ReportRuleController {

    private final ReportRuleService reportRuleService;

    @GetMapping
    public ResponseEntity<List<ReportRuleDto>> getRulesForReport(@PathVariable Long reportId) {
        return ResponseEntity.ok(reportRuleService.getRulesForReport(reportId));
    }

    @PostMapping
    public ResponseEntity<ReportRuleDto> addRuleToReport(
            @PathVariable Long reportId,
            @Valid @RequestBody ReportRuleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(reportRuleService.addRuleToReport(reportId, request));
    }

    @DeleteMapping("/{ruleId}")
    public ResponseEntity<Void> removeRuleFromReport(
            @PathVariable Long reportId,
            @PathVariable Long ruleId) {
        reportRuleService.removeRuleFromReport(reportId, ruleId);
        return ResponseEntity.noContent().build();
    }
}
