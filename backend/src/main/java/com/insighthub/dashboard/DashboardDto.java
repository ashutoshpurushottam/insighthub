package com.insighthub.dashboard;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class DashboardDto {
    private Long id;
    private String name;
    private String description;
    private String layoutType;
    private int columnsCount;
    private int autoRefreshSeconds;
    private boolean active;
    private List<DashboardItemDto> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
