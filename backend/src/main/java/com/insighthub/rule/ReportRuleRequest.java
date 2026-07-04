package com.insighthub.rule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReportRuleRequest {

    @NotNull(message = "Rule ID is required")
    private Long ruleId;

    @NotBlank(message = "Column name is required")
    @Size(max = 200)
    private String columnName;
}
