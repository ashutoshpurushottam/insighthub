package com.insighthub.reportgroup;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReportGroupDto {
    private Long id;
    private String name;
    private String description;
    private long reportCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
