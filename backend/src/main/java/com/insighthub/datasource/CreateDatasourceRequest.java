package com.insighthub.datasource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateDatasourceRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 50)
    private String name;

    @Size(max = 200)
    private String description;

    @Size(max = 20)
    private String datasourceType;

    @NotBlank(message = "Database type is required")
    @Size(max = 100)
    private String databaseType;

    @Size(max = 200)
    private String driver;

    @NotBlank(message = "URL is required")
    @Size(max = 2000)
    private String url;

    @Size(max = 100)
    private String username;

    @Size(max = 200)
    private String password;

    @Size(max = 60)
    private String testSql;

    private boolean active = true;
}
