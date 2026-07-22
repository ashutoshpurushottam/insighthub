package com.insighthub.job;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class CreateJobRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 200)
    private String name;

    @Size(max = 2000)
    private String description;

    @NotNull(message = "Report ID is required")
    private Long reportId;

    @NotNull(message = "Job type is required")
    private JobType jobType;

    @Size(max = 20)
    private String outputFormat = "CSV";

    private boolean active = true;

    // Schedule fields
    @Size(max = 20)
    private String cronSecond = "0";

    @Size(max = 20)
    private String cronMinute;

    @Size(max = 20)
    private String cronHour;

    @Size(max = 20)
    private String cronDay = "?";

    @Size(max = 20)
    private String cronMonth = "*";

    @Size(max = 20)
    private String cronWeekday = "*";

    @Size(max = 20)
    private String cronYear = "*";

    @Size(max = 50)
    private String timeZone;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private String extraSchedules;

    private boolean manual = false;

    // Email fields
    @Size(max = 2000)
    private String emailTo;

    @Size(max = 2000)
    private String emailCc;

    @Size(max = 2000)
    private String emailBcc;

    @Size(max = 500)
    private String emailReplyTo;

    @Size(max = 200)
    private String emailFrom;

    @Size(max = 500)
    private String emailSubject;

    private String emailMessage;

    private Long smtpServerId;

    private Long dynamicRecipientsReportId;

    // Publish/Archive fields
    private Integer runsToArchive = 0;

    private boolean allowSharing = false;

    private boolean allowSplitting = false;

    @Size(max = 200)
    private String fixedFileName;

    @Size(max = 200)
    private String subDirectory;

    // Pre/Post actions
    @Size(max = 500)
    private String preRunReportIds;

    @Size(max = 500)
    private String postRunReportIds;

    @Size(max = 200)
    private String batchFile;

    // Error handling
    @Size(max = 500)
    private String errorNotificationEmail;

    // Parameters
    private Map<String, Object> parameterValues;
}
