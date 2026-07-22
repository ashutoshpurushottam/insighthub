package com.insighthub.execution;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecuteReportRequest {

    private Map<String, Object> params;

    private List<String> nullParams;

    @Min(value = 1, message = "Page must be at least 1")
    @Builder.Default
    private int page = 1;

    @Min(value = 10, message = "Page size must be at least 10")
    @Max(value = 100, message = "Page size must not exceed 100")
    @Builder.Default
    private int pageSize = 25;

    private String sortColumn;

    @Pattern(regexp = "^(ASC|DESC)$", message = "Sort direction must be ASC or DESC")
    private String sortDirection;
}
