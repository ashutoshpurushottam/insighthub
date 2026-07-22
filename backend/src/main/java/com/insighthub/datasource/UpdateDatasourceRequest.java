package com.insighthub.datasource;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateDatasourceRequest {

    @Size(max = 50)
    private String name;

    @Size(max = 200)
    private String description;

    @Size(max = 20)
    private String datasourceType;

    @Size(max = 100)
    private String databaseType;

    @Size(max = 200)
    private String driver;

    @Size(max = 2000)
    private String url;

    @Size(max = 100)
    private String username;

    @Size(max = 200)
    private String password;

    @Size(max = 60)
    private String testSql;

    private Boolean active;
}
