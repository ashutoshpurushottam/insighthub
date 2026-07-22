package com.insighthub.datasource;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TestConnectionResult {
    private boolean success;
    private String message;
    private long elapsedMs;
}
