package com.insighthub.rule;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
import com.insighthub.usergroup.UserGroupEntity;
import com.insighthub.usergroup.UserGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RuleValueService {

    public static final String ALL_ITEMS = "ALL_ITEMS";

    private final UserRuleValueRepository userRuleValueRepository;
    private final UserGroupRuleValueRepository userGroupRuleValueRepository;
    private final UserRepository userRepository;
    private final UserGroupRepository userGroupRepository;
    private final RuleRepository ruleRepository;

    // ==================== USER RULE VALUES ====================

    /**
     * Get all rule values for a specific user and rule.
     */
    public List<String> getUserRuleValues(Long userId, Long ruleId) {
        validateUserExists(userId);
        validateRuleExists(ruleId);

        return userRuleValueRepository.findByUserIdAndRuleId(userId, ruleId).stream()
            .map(UserRuleValueEntity::getRuleValue)
            .toList();
    }

    /**
     * Get all rule values for a user, grouped by rule.
     */
    public List<RuleValueDto> getAllUserRuleValues(Long userId) {
        validateUserExists(userId);

        List<UserRuleValueEntity> entities = userRuleValueRepository.findByUserId(userId);

        Map<RuleEntity, List<UserRuleValueEntity>> grouped = entities.stream()
            .collect(Collectors.groupingBy(UserRuleValueEntity::getRule));

        return grouped.entrySet().stream()
            .map(entry -> RuleValueDto.builder()
                .ruleId(entry.getKey().getId())
                .ruleName(entry.getKey().getName())
                .values(entry.getValue().stream()
                    .map(UserRuleValueEntity::getRuleValue)
                    .toList())
                .build())
            .toList();
    }

    /**
     * Assign a rule value to a user. Duplicate values are ignored.
     */
    @Transactional
    public UserRuleValueEntity assignUserRuleValue(Long userId, Long ruleId, String value) {
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        RuleEntity rule = ruleRepository.findById(ruleId)
            .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", ruleId));

        List<UserRuleValueEntity> existing = userRuleValueRepository.findByUserIdAndRuleId(userId, ruleId);
        return existing.stream()
            .filter(e -> e.getRuleValue().equals(value))
            .findFirst()
            .orElseGet(() -> {
                UserRuleValueEntity entity = UserRuleValueEntity.builder()
                    .user(user)
                    .rule(rule)
                    .ruleValue(value)
                    .build();
                return userRuleValueRepository.save(entity);
            });
    }

    /**
     * Remove a specific rule value from a user.
     */
    @Transactional
    public void removeUserRuleValue(Long userId, Long ruleId, String value) {
        validateUserExists(userId);
        validateRuleExists(ruleId);

        List<UserRuleValueEntity> entities = userRuleValueRepository.findByUserIdAndRuleId(userId, ruleId);
        entities.stream()
            .filter(e -> e.getRuleValue().equals(value))
            .findFirst()
            .ifPresent(userRuleValueRepository::delete);
    }

    /**
     * Remove all rule values for a user and rule.
     */
    @Transactional
    public void removeAllUserRuleValues(Long userId, Long ruleId) {
        validateUserExists(userId);
        validateRuleExists(ruleId);

        userRuleValueRepository.deleteByUserIdAndRuleId(userId, ruleId);
    }

    // ==================== GROUP RULE VALUES ====================

    /**
     * Get all rule values for a specific group and rule.
     */
    public List<String> getGroupRuleValues(Long groupId, Long ruleId) {
        validateUserGroupExists(groupId);
        validateRuleExists(ruleId);

        return userGroupRuleValueRepository.findByUserGroupIdAndRuleId(groupId, ruleId).stream()
            .map(UserGroupRuleValueEntity::getRuleValue)
            .toList();
    }

    /**
     * Assign a rule value to a group. Duplicate values are ignored.
     */
    @Transactional
    public UserGroupRuleValueEntity assignGroupRuleValue(Long groupId, Long ruleId, String value) {
        UserGroupEntity group = userGroupRepository.findById(groupId)
            .orElseThrow(() -> new ResourceNotFoundException("UserGroup", "id", groupId));
        RuleEntity rule = ruleRepository.findById(ruleId)
            .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", ruleId));

        List<UserGroupRuleValueEntity> existing = userGroupRuleValueRepository
            .findByUserGroupIdAndRuleId(groupId, ruleId);
        return existing.stream()
            .filter(e -> e.getRuleValue().equals(value))
            .findFirst()
            .orElseGet(() -> {
                UserGroupRuleValueEntity entity = UserGroupRuleValueEntity.builder()
                    .userGroup(group)
                    .rule(rule)
                    .ruleValue(value)
                    .build();
                return userGroupRuleValueRepository.save(entity);
            });
    }

    /**
     * Remove a specific rule value from a group.
     */
    @Transactional
    public void removeGroupRuleValue(Long groupId, Long ruleId, String value) {
        validateUserGroupExists(groupId);
        validateRuleExists(ruleId);

        List<UserGroupRuleValueEntity> entities = userGroupRuleValueRepository
            .findByUserGroupIdAndRuleId(groupId, ruleId);
        entities.stream()
            .filter(e -> e.getRuleValue().equals(value))
            .findFirst()
            .ifPresent(userGroupRuleValueRepository::delete);
    }

    /**
     * Remove all rule values for a group and rule.
     */
    @Transactional
    public void removeAllGroupRuleValues(Long groupId, Long ruleId) {
        validateUserGroupExists(groupId);
        validateRuleExists(ruleId);

        userGroupRuleValueRepository.deleteByUserGroupIdAndRuleId(groupId, ruleId);
    }

    // ==================== EFFECTIVE VALUES (with group inheritance) ====================

    /**
     * Get effective rule values for a user and rule, merging direct and group values.
     * If ANY value is ALL_ITEMS, returns only ALL_ITEMS.
     */
    public List<String> getEffectiveRuleValues(Long userId, Long ruleId) {
        List<UserRuleValueEntity> directValues = userRuleValueRepository.findByUserIdAndRuleId(userId, ruleId);
        List<UserGroupEntity> userGroups = userGroupRepository.findByMembersId(userId);

        Set<String> merged = new LinkedHashSet<>();
        for (UserRuleValueEntity dv : directValues) {
            merged.add(dv.getRuleValue());
        }
        for (UserGroupEntity group : userGroups) {
            List<UserGroupRuleValueEntity> groupValues =
                userGroupRuleValueRepository.findByUserGroupIdAndRuleId(group.getId(), ruleId);
            for (UserGroupRuleValueEntity gv : groupValues) {
                merged.add(gv.getRuleValue());
            }
        }

        if (merged.contains(ALL_ITEMS)) {
            return List.of(ALL_ITEMS);
        }
        return new ArrayList<>(merged);
    }

    /**
     * Get effective rule values for a user across all rules, merging direct and group values.
     * Returns a map of ruleId → list of effective values.
     */
    public Map<Long, List<String>> getEffectiveRuleValuesForAllRules(Long userId) {
        List<UserRuleValueEntity> allDirectValues = userRuleValueRepository.findByUserId(userId);
        List<UserGroupEntity> userGroups = userGroupRepository.findByMembersId(userId);

        List<UserGroupRuleValueEntity> allGroupValues = new ArrayList<>();
        for (UserGroupEntity group : userGroups) {
            allGroupValues.addAll(userGroupRuleValueRepository.findByUserGroupId(group.getId()));
        }

        Set<Long> ruleIds = new HashSet<>();
        for (UserRuleValueEntity v : allDirectValues) {
            ruleIds.add(v.getRule().getId());
        }
        for (UserGroupRuleValueEntity v : allGroupValues) {
            ruleIds.add(v.getRule().getId());
        }

        Map<Long, List<String>> result = new HashMap<>();
        for (Long ruleId : ruleIds) {
            Set<String> merged = new LinkedHashSet<>();

            allDirectValues.stream()
                .filter(v -> v.getRule().getId().equals(ruleId))
                .map(UserRuleValueEntity::getRuleValue)
                .forEach(merged::add);

            allGroupValues.stream()
                .filter(v -> v.getRule().getId().equals(ruleId))
                .map(UserGroupRuleValueEntity::getRuleValue)
                .forEach(merged::add);

            if (merged.contains(ALL_ITEMS)) {
                result.put(ruleId, List.of(ALL_ITEMS));
            } else {
                result.put(ruleId, new ArrayList<>(merged));
            }
        }

        return result;
    }

    // ==================== VALIDATION HELPERS ====================

    private void validateUserExists(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", "id", userId);
        }
    }

    private void validateRuleExists(Long ruleId) {
        if (!ruleRepository.existsById(ruleId)) {
            throw new ResourceNotFoundException("Rule", "id", ruleId);
        }
    }

    private void validateUserGroupExists(Long groupId) {
        if (!userGroupRepository.existsById(groupId)) {
            throw new ResourceNotFoundException("UserGroup", "id", groupId);
        }
    }
}
