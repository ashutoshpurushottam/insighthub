package com.insighthub.dashboard;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardItemDto {
    private Long id;
    private Long reportId;
    private String reportName;
    private String title;
    private int position;
    private int colSpan;
    private int rowSpan;
}
