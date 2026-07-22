package com.insighthub.dashboard;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class DashboardRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100)
    private String name;

    @Size(max = 500)
    private String description;

    private String layoutType = "GRID";
    private int columnsCount = 2;
    private int autoRefreshSeconds = 0;
    private boolean active = true;
    private List<DashboardItemRequest> items;
}
