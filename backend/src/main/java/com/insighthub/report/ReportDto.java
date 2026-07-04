package com.insighthub.report;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReportDto {
    private Long id;
    private String name;
    private String shortDescription;
    private String description;
    private int reportType;
    private Long reportGroupId;
    private String reportGroupName;
    private Long datasourceId;
    private String datasourceName;
    private String contactPerson;
    private boolean active;
    private boolean hidden;
    private boolean usePreparedStatements;
    private boolean usesRules;
    private String defaultReportFormat;
    private String reportSource;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
