package com.insighthub.usergroup;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/user-groups")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('configure_user_groups') or hasRole('ADMIN')")
public class UserGroupController {

    private final UserGroupService userGroupService;

    @GetMapping
    public ResponseEntity<List<UserGroupDto>> getAllUserGroups() {
        return ResponseEntity.ok(userGroupService.getAllUserGroups());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserGroupDto> getUserGroupById(@PathVariable Long id) {
        return ResponseEntity.ok(userGroupService.getUserGroupById(id));
    }

    @PostMapping
    public ResponseEntity<UserGroupDto> createUserGroup(@Valid @RequestBody UserGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userGroupService.createUserGroup(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserGroupDto> updateUserGroup(@PathVariable Long id, @Valid @RequestBody UserGroupRequest request) {
        return ResponseEntity.ok(userGroupService.updateUserGroup(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUserGroup(@PathVariable Long id) {
        userGroupService.deleteUserGroup(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<UserGroupDto> addMembers(@PathVariable Long id, @RequestBody Set<Long> userIds) {
        return ResponseEntity.ok(userGroupService.addMembers(id, userIds));
    }

    @DeleteMapping("/{id}/members")
    public ResponseEntity<UserGroupDto> removeMembers(@PathVariable Long id, @RequestBody Set<Long> userIds) {
        return ResponseEntity.ok(userGroupService.removeMembers(id, userIds));
    }

    @PutMapping("/{id}/roles")
    public ResponseEntity<UserGroupDto> assignRoles(@PathVariable Long id, @RequestBody Set<Long> roleIds) {
        return ResponseEntity.ok(userGroupService.assignRoles(id, roleIds));
    }
}
