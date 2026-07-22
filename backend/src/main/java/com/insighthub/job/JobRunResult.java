package com.insighthub.job;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class JobRunResult {
    private boolean success;
    private String message;
    private long executionMs;
    private Long executionId;

    /**
     * Legacy constructor for backward compatibility.
     */
    public JobRunResult(boolean success, String message, long executionMs) {
        this.success = success;
        this.message = message;
        this.executionMs = executionMs;
        this.executionId = null;
    }
}
