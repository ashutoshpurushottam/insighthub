package com.insighthub.rule;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReportRuleDto {
    private Long id;
    private Long ruleId;
    private String ruleName;
    private String columnName;
}
