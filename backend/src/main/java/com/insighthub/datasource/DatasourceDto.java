package com.insighthub.datasource;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DatasourceDto {
    private Long id;
    private String name;
    private String description;
    private String datasourceType;
    private String databaseType;
    private String driver;
    private String url;
    private String username;
    // password intentionally excluded from responses
    private boolean active;
    private String testSql;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
