package com.insighthub.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateReportRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100)
    private String name;

    @Size(max = 254)
    private String shortDescription;

    @Size(max = 2000)
    private String description;

    private int reportType = 0;

    private Long reportGroupId;

    private Long datasourceId;

    @Size(max = 100)
    private String contactPerson;

    private boolean active = true;

    private boolean usePreparedStatements = true;

    private boolean usesRules = false;

    private String reportSource;

    @Size(max = 50)
    private String defaultReportFormat;
}
