package com.insighthub.rule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RuleValueRequest {

    @NotBlank(message = "Value is required")
    @Size(max = 500)
    private String value;
}
