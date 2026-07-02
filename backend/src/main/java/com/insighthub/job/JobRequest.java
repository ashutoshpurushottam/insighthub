package com.insighthub.job;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class JobRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 200)
    private String name;

    @Size(max = 2000)
    private String description;

    @NotNull(message = "Report is required")
    private Long reportId;

    @NotBlank(message = "Job type is required")
    private String jobType;

    private String outputFormat;

    private boolean active = true;
}
