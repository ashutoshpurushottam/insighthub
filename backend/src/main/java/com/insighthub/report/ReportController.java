package com.insighthub.report;

import com.insighthub.execution.ExecuteReportRequest;
import com.insighthub.execution.PaginatedResult;
import com.insighthub.execution.ReportExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final ReportRunService reportRunService;
    private final ReportExecutionService reportExecutionService;

    @GetMapping
    public ResponseEntity<List<ReportDto>> getAllReports() {
        return ResponseEntity.ok(reportService.getAllReports());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportDto> getReportById(@PathVariable Long id) {
        return ResponseEntity.ok(reportService.getReportById(id));
    }

    @PostMapping
    public ResponseEntity<ReportDto> createReport(
            @Valid @RequestBody CreateReportRequest request,
            @AuthenticationPrincipal UserDetails currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(reportService.createReport(request, currentUser.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReportDto> updateReport(
            @PathVariable Long id,
            @Valid @RequestBody CreateReportRequest request,
            @AuthenticationPrincipal UserDetails currentUser) {
        return ResponseEntity.ok(reportService.updateReport(id, request, currentUser.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable Long id) {
        reportService.deleteReport(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/run-adhoc")
    public ResponseEntity<RunReportResult> runAdHocQuery(
            @Valid @RequestBody AdHocQueryRequest request) {
        return ResponseEntity.ok(
            reportRunService.executeSql(request.getDatasourceId(), request.getSql()));
    }

    @PostMapping("/{id}/run")
    public ResponseEntity<RunReportResult> runReport(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> params) {
        return ResponseEntity.ok(reportRunService.runReport(id, params));
    }

    @PostMapping("/{id}/execute")
    public ResponseEntity<PaginatedResult> executeReport(
            @PathVariable Long id,
            @Valid @RequestBody ExecuteReportRequest request,
            @AuthenticationPrincipal UserDetails currentUser) {
        PaginatedResult result = reportExecutionService.execute(id, request, currentUser.getUsername());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/clone")
    public ResponseEntity<ReportDto> cloneReport(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(reportService.cloneReport(id, currentUser.getUsername()));
    }
}
