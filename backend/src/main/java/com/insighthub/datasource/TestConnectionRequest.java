package com.insighthub.datasource;

import lombok.Data;

@Data
public class TestConnectionRequest {
    private String url;
    private String username;
    private String password;
    private String driver;
    private String testSql;
}
