package com.insighthub.dashboard;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboards")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<List<DashboardDto>> getAll() {
        return ResponseEntity.ok(dashboardService.getAllDashboards());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DashboardDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(dashboardService.getDashboardById(id));
    }

    @PostMapping
    public ResponseEntity<DashboardDto> create(
            @Valid @RequestBody DashboardRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(dashboardService.createDashboard(request, user.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DashboardDto> update(
            @PathVariable Long id,
            @Valid @RequestBody DashboardRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(dashboardService.updateDashboard(id, request, user.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        dashboardService.deleteDashboard(id);
        return ResponseEntity.noContent().build();
    }
}
