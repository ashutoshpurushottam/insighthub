package com.insighthub.dashboard;

import lombok.Data;

@Data
public class DashboardItemRequest {
    private Long reportId;
    private String title;
    private int position;
    private int colSpan = 1;
    private int rowSpan = 1;
}
