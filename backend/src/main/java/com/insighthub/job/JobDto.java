package com.insighthub.job;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class JobDto {
    private Long id;
    private String name;
    private String description;
    private Long reportId;
    private String reportName;
    private String jobType;
    private String outputFormat;
    private boolean active;
    private Long ownerUserId;
    private String ownerUsername;

    // Schedule fields
    private String cronSecond;
    private String cronMinute;
    private String cronHour;
    private String cronDay;
    private String cronMonth;
    private String cronWeekday;
    private String cronYear;
    private String timeZone;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String extraSchedules;
    private boolean manual;

    // Email fields
    private String emailTo;
    private String emailCc;
    private String emailBcc;
    private String emailReplyTo;
    private String emailFrom;
    private String emailSubject;
    private String emailMessage;
    private Long smtpServerId;
    private String smtpServerName;
    private Long dynamicRecipientsReportId;

    // Publish/Archive fields
    private Integer runsToArchive;
    private boolean allowSharing;
    private boolean allowSplitting;
    private String fixedFileName;
    private String subDirectory;

    // Pre/Post actions
    private String preRunReportIds;
    private String postRunReportIds;
    private String batchFile;

    // Error handling
    private String errorNotificationEmail;

    // Parameters
    private Map<String, Object> parameterValues;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
