package com.insighthub.rule;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RuleDto {
    private Long id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
}
