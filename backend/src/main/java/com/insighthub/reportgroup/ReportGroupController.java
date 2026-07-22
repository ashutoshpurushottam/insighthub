package com.insighthub.reportgroup;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/report-groups")
@RequiredArgsConstructor
public class ReportGroupController {

    private final ReportGroupService reportGroupService;

    @GetMapping
    public ResponseEntity<List<ReportGroupDto>> getAllReportGroups() {
        return ResponseEntity.ok(reportGroupService.getAllReportGroups());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportGroupDto> getReportGroupById(@PathVariable Long id) {
        return ResponseEntity.ok(reportGroupService.getReportGroupById(id));
    }

    @PostMapping
    public ResponseEntity<ReportGroupDto> createReportGroup(@Valid @RequestBody ReportGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reportGroupService.createReportGroup(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReportGroupDto> updateReportGroup(
            @PathVariable Long id, @Valid @RequestBody ReportGroupRequest request) {
        return ResponseEntity.ok(reportGroupService.updateReportGroup(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReportGroup(@PathVariable Long id) {
        reportGroupService.deleteReportGroup(id);
        return ResponseEntity.noContent().build();
    }
}
