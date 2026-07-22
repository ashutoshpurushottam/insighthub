package com.insighthub.accessright;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/access-rights")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('configure_access_rights') or hasRole('ADMIN')")
public class AccessRightController {

    private final AccessRightService accessRightService;

    // ===== User -> Reports =====

    @GetMapping("/users/{userId}/reports")
    public ResponseEntity<List<Long>> getUserReportRights(@PathVariable Long userId) {
        return ResponseEntity.ok(accessRightService.getUserReportIds(userId));
    }

    @PutMapping("/users/{userId}/reports")
    public ResponseEntity<Void> setUserReportRights(@PathVariable Long userId, @RequestBody Set<Long> reportIds) {
        accessRightService.setUserReportRights(userId, reportIds);
        return ResponseEntity.ok().build();
    }

    // ===== User -> Report Groups =====

    @GetMapping("/users/{userId}/report-groups")
    public ResponseEntity<List<Long>> getUserReportGroupRights(@PathVariable Long userId) {
        return ResponseEntity.ok(accessRightService.getUserReportGroupIds(userId));
    }

    @PutMapping("/users/{userId}/report-groups")
    public ResponseEntity<Void> setUserReportGroupRights(@PathVariable Long userId, @RequestBody Set<Long> groupIds) {
        accessRightService.setUserReportGroupRights(userId, groupIds);
        return ResponseEntity.ok().build();
    }

    // ===== UserGroup -> Reports =====

    @GetMapping("/user-groups/{groupId}/reports")
    public ResponseEntity<List<Long>> getUserGroupReportRights(@PathVariable Long groupId) {
        return ResponseEntity.ok(accessRightService.getUserGroupReportIds(groupId));
    }

    @PutMapping("/user-groups/{groupId}/reports")
    public ResponseEntity<Void> setUserGroupReportRights(@PathVariable Long groupId, @RequestBody Set<Long> reportIds) {
        accessRightService.setUserGroupReportRights(groupId, reportIds);
        return ResponseEntity.ok().build();
    }

    // ===== UserGroup -> Report Groups =====

    @GetMapping("/user-groups/{groupId}/report-groups")
    public ResponseEntity<List<Long>> getUserGroupReportGroupRights(@PathVariable Long groupId) {
        return ResponseEntity.ok(accessRightService.getUserGroupReportGroupIds(groupId));
    }

    @PutMapping("/user-groups/{groupId}/report-groups")
    public ResponseEntity<Void> setUserGroupReportGroupRights(@PathVariable Long groupId, @RequestBody Set<Long> reportGroupIds) {
        accessRightService.setUserGroupReportGroupRights(groupId, reportGroupIds);
        return ResponseEntity.ok().build();
    }
}
