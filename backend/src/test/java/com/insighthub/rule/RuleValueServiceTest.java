package com.insighthub.rule;

import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
import com.insighthub.usergroup.UserGroupEntity;
import com.insighthub.usergroup.UserGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RuleValueServiceTest {

    @Mock
    private UserRuleValueRepository userRuleValueRepository;

    @Mock
    private UserGroupRuleValueRepository userGroupRuleValueRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserGroupRepository userGroupRepository;

    @Mock
    private RuleRepository ruleRepository;

    @InjectMocks
    private RuleValueService ruleValueService;

    private UserEntity user;
    private RuleEntity rule1;
    private RuleEntity rule2;
    private UserGroupEntity group1;
    private UserGroupEntity group2;

    @BeforeEach
    void setUp() {
        user = UserEntity.builder().id(1L).username("john").build();
        rule1 = RuleEntity.builder().id(10L).name("GeoArea").build();
        rule2 = RuleEntity.builder().id(20L).name("Department").build();
        group1 = UserGroupEntity.builder().id(100L).name("Sales").build();
        group2 = UserGroupEntity.builder().id(200L).name("Marketing").build();
    }

    @Test
    void getEffectiveRuleValues_directValuesOnly_returnsDirect() {
        UserRuleValueEntity v1 = UserRuleValueEntity.builder()
            .id(1L).user(user).rule(rule1).ruleValue("NORTH").build();
        UserRuleValueEntity v2 = UserRuleValueEntity.builder()
            .id(2L).user(user).rule(rule1).ruleValue("EAST").build();

        when(userRuleValueRepository.findByUserIdAndRuleId(1L, 10L)).thenReturn(List.of(v1, v2));
        when(userGroupRepository.findByMembersId(1L)).thenReturn(List.of());

        List<String> result = ruleValueService.getEffectiveRuleValues(1L, 10L);

        assertEquals(2, result.size());
        assertTrue(result.contains("NORTH"));
        assertTrue(result.contains("EAST"));
    }

    @Test
    void getEffectiveRuleValues_groupValuesOnly_returnsGroupValues() {
        when(userRuleValueRepository.findByUserIdAndRuleId(1L, 10L)).thenReturn(List.of());
        when(userGroupRepository.findByMembersId(1L)).thenReturn(List.of(group1));

        UserGroupRuleValueEntity gv = UserGroupRuleValueEntity.builder()
            .id(1L).userGroup(group1).rule(rule1).ruleValue("SOUTH").build();
        when(userGroupRuleValueRepository.findByUserGroupIdAndRuleId(100L, 10L)).thenReturn(List.of(gv));

        List<String> result = ruleValueService.getEffectiveRuleValues(1L, 10L);

        assertEquals(1, result.size());
        assertTrue(result.contains("SOUTH"));
    }

    @Test
    void getEffectiveRuleValues_mergesDirectAndGroupValues_deduplicated() {
        UserRuleValueEntity dv = UserRuleValueEntity.builder()
            .id(1L).user(user).rule(rule1).ruleValue("NORTH").build();
        when(userRuleValueRepository.findByUserIdAndRuleId(1L, 10L)).thenReturn(List.of(dv));

        when(userGroupRepository.findByMembersId(1L)).thenReturn(List.of(group1, group2));

        UserGroupRuleValueEntity gv1 = UserGroupRuleValueEntity.builder()
            .id(1L).userGroup(group1).rule(rule1).ruleValue("NORTH").build(); // duplicate
        UserGroupRuleValueEntity gv2 = UserGroupRuleValueEntity.builder()
            .id(2L).userGroup(group2).rule(rule1).ruleValue("WEST").build();

        when(userGroupRuleValueRepository.findByUserGroupIdAndRuleId(100L, 10L)).thenReturn(List.of(gv1));
        when(userGroupRuleValueRepository.findByUserGroupIdAndRuleId(200L, 10L)).thenReturn(List.of(gv2));

        List<String> result = ruleValueService.getEffectiveRuleValues(1L, 10L);

        assertEquals(2, result.size());
        assertTrue(result.contains("NORTH"));
        assertTrue(result.contains("WEST"));
    }

    @Test
    void getEffectiveRuleValues_directAllItems_returnsOnlyAllItems() {
        UserRuleValueEntity dv = UserRuleValueEntity.builder()
            .id(1L).user(user).rule(rule1).ruleValue("ALL_ITEMS").build();
        when(userRuleValueRepository.findByUserIdAndRuleId(1L, 10L)).thenReturn(List.of(dv));
        when(userGroupRepository.findByMembersId(1L)).thenReturn(List.of());

        List<String> result = ruleValueService.getEffectiveRuleValues(1L, 10L);

        assertEquals(1, result.size());
        assertEquals("ALL_ITEMS", result.get(0));
    }

    @Test
    void getEffectiveRuleValues_groupAllItems_returnsOnlyAllItems() {
        when(userRuleValueRepository.findByUserIdAndRuleId(1L, 10L)).thenReturn(List.of());
        when(userGroupRepository.findByMembersId(1L)).thenReturn(List.of(group1));

        UserGroupRuleValueEntity gv = UserGroupRuleValueEntity.builder()
            .id(1L).userGroup(group1).rule(rule1).ruleValue("ALL_ITEMS").build();
        when(userGroupRuleValueRepository.findByUserGroupIdAndRuleId(100L, 10L)).thenReturn(List.of(gv));

        List<String> result = ruleValueService.getEffectiveRuleValues(1L, 10L);

        assertEquals(1, result.size());
        assertEquals("ALL_ITEMS", result.get(0));
    }

    @Test
    void getEffectiveRuleValues_noValuesAnywhere_returnsEmpty() {
        when(userRuleValueRepository.findByUserIdAndRuleId(1L, 10L)).thenReturn(List.of());
        when(userGroupRepository.findByMembersId(1L)).thenReturn(List.of(group1));
        when(userGroupRuleValueRepository.findByUserGroupIdAndRuleId(100L, 10L)).thenReturn(List.of());

        List<String> result = ruleValueService.getEffectiveRuleValues(1L, 10L);

        assertTrue(result.isEmpty());
    }

    @Test
    void getEffectiveRuleValuesForAllRules_mergesAcrossMultipleRules() {
        // Direct values: rule1=NORTH, rule2=SALES
        UserRuleValueEntity dv1 = UserRuleValueEntity.builder()
            .id(1L).user(user).rule(rule1).ruleValue("NORTH").build();
        UserRuleValueEntity dv2 = UserRuleValueEntity.builder()
            .id(2L).user(user).rule(rule2).ruleValue("SALES").build();
        when(userRuleValueRepository.findByUserId(1L)).thenReturn(List.of(dv1, dv2));

        // User belongs to group1
        when(userGroupRepository.findByMembersId(1L)).thenReturn(List.of(group1));

        // Group1 values: rule1=SOUTH, rule2=ALL_ITEMS
        UserGroupRuleValueEntity gv1 = UserGroupRuleValueEntity.builder()
            .id(1L).userGroup(group1).rule(rule1).ruleValue("SOUTH").build();
        UserGroupRuleValueEntity gv2 = UserGroupRuleValueEntity.builder()
            .id(2L).userGroup(group1).rule(rule2).ruleValue("ALL_ITEMS").build();
        when(userGroupRuleValueRepository.findByUserGroupId(100L)).thenReturn(List.of(gv1, gv2));

        Map<Long, List<String>> result = ruleValueService.getEffectiveRuleValuesForAllRules(1L);

        // Rule1: NORTH + SOUTH merged
        assertEquals(2, result.get(10L).size());
        assertTrue(result.get(10L).contains("NORTH"));
        assertTrue(result.get(10L).contains("SOUTH"));

        // Rule2: SALES + ALL_ITEMS -> collapses to ALL_ITEMS only
        assertEquals(1, result.get(20L).size());
        assertEquals("ALL_ITEMS", result.get(20L).get(0));
    }

    @Test
    void getEffectiveRuleValuesForAllRules_noValues_returnsEmptyMap() {
        when(userRuleValueRepository.findByUserId(1L)).thenReturn(List.of());
        when(userGroupRepository.findByMembersId(1L)).thenReturn(List.of());

        Map<Long, List<String>> result = ruleValueService.getEffectiveRuleValuesForAllRules(1L);

        assertTrue(result.isEmpty());
    }

    @Test
    void getEffectiveRuleValuesForAllRules_multipleGroups_mergesAll() {
        when(userRuleValueRepository.findByUserId(1L)).thenReturn(List.of());
        when(userGroupRepository.findByMembersId(1L)).thenReturn(List.of(group1, group2));

        UserGroupRuleValueEntity gv1 = UserGroupRuleValueEntity.builder()
            .id(1L).userGroup(group1).rule(rule1).ruleValue("NORTH").build();
        UserGroupRuleValueEntity gv2 = UserGroupRuleValueEntity.builder()
            .id(2L).userGroup(group2).rule(rule1).ruleValue("SOUTH").build();

        when(userGroupRuleValueRepository.findByUserGroupId(100L)).thenReturn(List.of(gv1));
        when(userGroupRuleValueRepository.findByUserGroupId(200L)).thenReturn(List.of(gv2));

        Map<Long, List<String>> result = ruleValueService.getEffectiveRuleValuesForAllRules(1L);

        assertEquals(2, result.get(10L).size());
        assertTrue(result.get(10L).contains("NORTH"));
        assertTrue(result.get(10L).contains("SOUTH"));
    }
}
