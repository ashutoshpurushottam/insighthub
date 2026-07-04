package com.insighthub.rule;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class RuleValueController {

    private final RuleValueService ruleValueService;

    // --- User Rule Values ---

    @GetMapping("/api/rules/{ruleId}/values/users/{userId}")
    public ResponseEntity<List<String>> getUserRuleValues(
            @PathVariable Long ruleId,
            @PathVariable Long userId) {
        List<String> values = ruleValueService.getUserRuleValues(userId, ruleId);
        return ResponseEntity.ok(values);
    }

    @PostMapping("/api/rules/{ruleId}/values/users/{userId}")
    public ResponseEntity<Void> assignUserRuleValue(
            @PathVariable Long ruleId,
            @PathVariable Long userId,
            @Valid @RequestBody RuleValueRequest request) {
        ruleValueService.assignUserRuleValue(userId, ruleId, request.getValue());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/api/rules/{ruleId}/values/users/{userId}")
    public ResponseEntity<Void> removeAllUserRuleValues(
            @PathVariable Long ruleId,
            @PathVariable Long userId) {
        ruleValueService.removeAllUserRuleValues(userId, ruleId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/rules/{ruleId}/values/users/{userId}/{value}")
    public ResponseEntity<Void> removeUserRuleValue(
            @PathVariable Long ruleId,
            @PathVariable Long userId,
            @PathVariable String value) {
        ruleValueService.removeUserRuleValue(userId, ruleId, value);
        return ResponseEntity.noContent().build();
    }

    // --- Group Rule Values ---

    @GetMapping("/api/rules/{ruleId}/values/groups/{groupId}")
    public ResponseEntity<List<String>> getGroupRuleValues(
            @PathVariable Long ruleId,
            @PathVariable Long groupId) {
        List<String> values = ruleValueService.getGroupRuleValues(groupId, ruleId);
        return ResponseEntity.ok(values);
    }

    @PostMapping("/api/rules/{ruleId}/values/groups/{groupId}")
    public ResponseEntity<Void> assignGroupRuleValue(
            @PathVariable Long ruleId,
            @PathVariable Long groupId,
            @Valid @RequestBody RuleValueRequest request) {
        ruleValueService.assignGroupRuleValue(groupId, ruleId, request.getValue());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/api/rules/{ruleId}/values/groups/{groupId}")
    public ResponseEntity<Void> removeAllGroupRuleValues(
            @PathVariable Long ruleId,
            @PathVariable Long groupId) {
        ruleValueService.removeAllGroupRuleValues(groupId, ruleId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/rules/{ruleId}/values/groups/{groupId}/{value}")
    public ResponseEntity<Void> removeGroupRuleValue(
            @PathVariable Long ruleId,
            @PathVariable Long groupId,
            @PathVariable String value) {
        ruleValueService.removeGroupRuleValue(groupId, ruleId, value);
        return ResponseEntity.noContent().build();
    }

    // --- User Summary ---

    @GetMapping("/api/users/{userId}/rule-values")
    public ResponseEntity<List<RuleValueDto>> getAllRuleValuesForUser(
            @PathVariable Long userId) {
        List<RuleValueDto> values = ruleValueService.getAllUserRuleValues(userId);
        return ResponseEntity.ok(values);
    }
}
