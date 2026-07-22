package com.insighthub.execution;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrillDownInfo {
    private String column;
    private Long childReportId;
    private String childReportName;
}
