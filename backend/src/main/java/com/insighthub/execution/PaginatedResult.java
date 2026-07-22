package com.insighthub.execution;

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
public class PaginatedResult {
    private List<String> columns;
    private List<Map<String, Object>> rows;
    private PaginationMeta pagination;
    private long executionMs;
    private boolean truncated;
    private String truncationReason;
    private List<DrillDownInfo> drillDownLinks;
}
