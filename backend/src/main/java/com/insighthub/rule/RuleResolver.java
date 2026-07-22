package com.insighthub.rule;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Resolves rule-based WHERE clauses for a report and user.
 * Generates SQL IN-clauses from the user's effective rule values,
 * handling ALL_ITEMS (no filter), empty values (error), and SQL injection prevention.
 */
@Service
@RequiredArgsConstructor
public class RuleResolver {

    private final ReportRuleRepository reportRuleRepository;
    private final RuleValueService ruleValueService;

    /**
     * Generates a WHERE clause fragment from the user's effective rule values for a report.
     *
     * @param reportId the report being executed
     * @param userId   the user executing the report
     * @return SQL clause like "col IN ('v1','v2') AND col2 IN ('v3')", or "1=1" if all rules are ALL_ITEMS
     * @throws RuntimeException if the user has no values defined for a required rule
     */
    public String resolve(Long reportId, Long userId) {
        List<ReportRuleEntity> reportRules = reportRuleRepository.findByReportId(reportId);

        if (reportRules.isEmpty()) {
            return "1=1";
        }

        List<String> clauses = new ArrayList<>();

        for (ReportRuleEntity reportRule : reportRules) {
            Long ruleId = reportRule.getRule().getId();
            String ruleName = reportRule.getRule().getName();
            String columnName = reportRule.getColumnName();

            List<String> effectiveValues = ruleValueService.getEffectiveRuleValues(userId, ruleId);

            if (effectiveValues.isEmpty()) {
                throw new RuntimeException(
                    "User " + userId + " has no values defined for rule '" + ruleName
                        + "'. Cannot execute report.");
            }

            // ALL_ITEMS means no filtering for this rule
            if (effectiveValues.size() == 1
                    && RuleValueService.ALL_ITEMS.equals(effectiveValues.get(0))) {
                continue;
            }

            String inClause = effectiveValues.stream()
                .map(RuleResolver::escapeValue)
                .collect(Collectors.joining(",", columnName + " IN (", ")"));

            clauses.add(inClause);
        }

        if (clauses.isEmpty()) {
            return "1=1";
        }

        return String.join(" AND ", clauses);
    }

    /**
     * Escapes a value for safe inclusion in a SQL IN clause.
     * Single quotes within values are escaped by doubling them.
     */
    static String escapeValue(String value) {
        String escaped = value.replace("'", "''");
        return "'" + escaped + "'";
    }
}
