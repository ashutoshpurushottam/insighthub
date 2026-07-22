package com.insighthub.rule;

import com.insighthub.report.ReportEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RuleResolverTest {

    @Mock
    private ReportRuleRepository reportRuleRepository;

    @Mock
    private RuleValueService ruleValueService;

    @InjectMocks
    private RuleResolver ruleResolver;

    private ReportEntity report;
    private RuleEntity rule1;
    private RuleEntity rule2;

    @BeforeEach
    void setUp() {
        report = ReportEntity.builder().id(1L).build();
        rule1 = RuleEntity.builder().id(10L).name("GeoArea").build();
        rule2 = RuleEntity.builder().id(20L).name("Department").build();
    }

    @Test
    void resolve_singleRuleSingleValue_returnsInClause() {
        ReportRuleEntity mapping = ReportRuleEntity.builder()
            .id(1L).report(report).rule(rule1).columnName("employees.region").build();

        when(reportRuleRepository.findByReportId(1L)).thenReturn(List.of(mapping));
        when(ruleValueService.getEffectiveRuleValues(5L, 10L)).thenReturn(List.of("NORTH"));

        String result = ruleResolver.resolve(1L, 5L);

        assertEquals("employees.region IN ('NORTH')", result);
    }

    @Test
    void resolve_singleRuleMultipleValues_returnsInClauseWithAllValues() {
        ReportRuleEntity mapping = ReportRuleEntity.builder()
            .id(1L).report(report).rule(rule1).columnName("employees.region").build();

        when(reportRuleRepository.findByReportId(1L)).thenReturn(List.of(mapping));
        when(ruleValueService.getEffectiveRuleValues(5L, 10L)).thenReturn(List.of("NORTH", "EAST"));

        String result = ruleResolver.resolve(1L, 5L);

        assertEquals("employees.region IN ('NORTH','EAST')", result);
    }

    @Test
    void resolve_multipleRules_joinsClausesWithAnd() {
        ReportRuleEntity mapping1 = ReportRuleEntity.builder()
            .id(1L).report(report).rule(rule1).columnName("employees.region").build();
        ReportRuleEntity mapping2 = ReportRuleEntity.builder()
            .id(2L).report(report).rule(rule2).columnName("departments.dept_id").build();

        when(reportRuleRepository.findByReportId(1L)).thenReturn(List.of(mapping1, mapping2));
        when(ruleValueService.getEffectiveRuleValues(5L, 10L)).thenReturn(List.of("NORTH", "EAST"));
        when(ruleValueService.getEffectiveRuleValues(5L, 20L)).thenReturn(List.of("10", "20"));

        String result = ruleResolver.resolve(1L, 5L);

        assertEquals("employees.region IN ('NORTH','EAST') AND departments.dept_id IN ('10','20')", result);
    }

    @Test
    void resolve_ruleWithAllItems_skipsClauseForThatRule() {
        ReportRuleEntity mapping1 = ReportRuleEntity.builder()
            .id(1L).report(report).rule(rule1).columnName("employees.region").build();
        ReportRuleEntity mapping2 = ReportRuleEntity.builder()
            .id(2L).report(report).rule(rule2).columnName("departments.dept_id").build();

        when(reportRuleRepository.findByReportId(1L)).thenReturn(List.of(mapping1, mapping2));
        when(ruleValueService.getEffectiveRuleValues(5L, 10L)).thenReturn(List.of("ALL_ITEMS"));
        when(ruleValueService.getEffectiveRuleValues(5L, 20L)).thenReturn(List.of("10"));

        String result = ruleResolver.resolve(1L, 5L);

        assertEquals("departments.dept_id IN ('10')", result);
    }

    @Test
    void resolve_allRulesWithAllItems_returns1Equals1() {
        ReportRuleEntity mapping1 = ReportRuleEntity.builder()
            .id(1L).report(report).rule(rule1).columnName("employees.region").build();
        ReportRuleEntity mapping2 = ReportRuleEntity.builder()
            .id(2L).report(report).rule(rule2).columnName("departments.dept_id").build();

        when(reportRuleRepository.findByReportId(1L)).thenReturn(List.of(mapping1, mapping2));
        when(ruleValueService.getEffectiveRuleValues(5L, 10L)).thenReturn(List.of("ALL_ITEMS"));
        when(ruleValueService.getEffectiveRuleValues(5L, 20L)).thenReturn(List.of("ALL_ITEMS"));

        String result = ruleResolver.resolve(1L, 5L);

        assertEquals("1=1", result);
    }

    @Test
    void resolve_userHasNoValuesForRule_throwsException() {
        ReportRuleEntity mapping = ReportRuleEntity.builder()
            .id(1L).report(report).rule(rule1).columnName("employees.region").build();

        when(reportRuleRepository.findByReportId(1L)).thenReturn(List.of(mapping));
        when(ruleValueService.getEffectiveRuleValues(5L, 10L)).thenReturn(List.of());

        RuntimeException ex = assertThrows(
            RuntimeException.class,
            () -> ruleResolver.resolve(1L, 5L)
        );

        assertTrue(ex.getMessage().contains("no values defined"));
        assertTrue(ex.getMessage().contains("GeoArea"));
    }

    @Test
    void resolve_valuesWithSingleQuotes_escapesCorrectly() {
        ReportRuleEntity mapping = ReportRuleEntity.builder()
            .id(1L).report(report).rule(rule1).columnName("employees.name").build();

        when(reportRuleRepository.findByReportId(1L)).thenReturn(List.of(mapping));
        when(ruleValueService.getEffectiveRuleValues(5L, 10L)).thenReturn(List.of("O'Brien", "D'Arcy"));

        String result = ruleResolver.resolve(1L, 5L);

        assertEquals("employees.name IN ('O''Brien','D''Arcy')", result);
    }

    @Test
    void resolve_noReportRules_returns1Equals1() {
        when(reportRuleRepository.findByReportId(1L)).thenReturn(List.of());

        String result = ruleResolver.resolve(1L, 5L);

        assertEquals("1=1", result);
    }
}
