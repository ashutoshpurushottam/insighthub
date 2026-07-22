package com.insighthub.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdHocQueryRequest {

    @NotNull(message = "Datasource ID is required")
    private Long datasourceId;

    @NotBlank(message = "SQL query is required")
    private String sql;
}
