package com.insighthub.report;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class RunReportResult {
    private List<String> columns;
    private List<Map<String, Object>> rows;
    private int rowCount;
    private long executionMs;
}
