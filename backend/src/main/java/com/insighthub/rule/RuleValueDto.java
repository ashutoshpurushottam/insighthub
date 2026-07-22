package com.insighthub.rule;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RuleValueDto {
    private Long ruleId;
    private String ruleName;
    private List<String> values;
}
