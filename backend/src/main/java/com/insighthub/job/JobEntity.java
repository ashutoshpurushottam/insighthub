package com.insighthub.job;

import com.insighthub.report.ReportEntity;
import com.insighthub.smtp.SmtpServerEntity;
import com.insighthub.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 2000)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private ReportEntity report;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false, length = 50)
    private JobType jobType;

    @Column(name = "output_format", length = 20)
    @Builder.Default
    private String outputFormat = "CSV";

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private UserEntity owner;

    @Column(name = "owner_user_id", insertable = false, updatable = false)
    private Long ownerUserId;

    // Schedule fields
    @Column(name = "cron_second", length = 20)
    @Builder.Default
    private String cronSecond = "0";

    @Column(name = "cron_minute", length = 20)
    private String cronMinute;

    @Column(name = "cron_hour", length = 20)
    private String cronHour;

    @Column(name = "cron_day", length = 20)
    @Builder.Default
    private String cronDay = "?";

    @Column(name = "cron_month", length = 20)
    @Builder.Default
    private String cronMonth = "*";

    @Column(name = "cron_weekday", length = 20)
    @Builder.Default
    private String cronWeekday = "*";

    @Column(name = "cron_year", length = 20)
    @Builder.Default
    private String cronYear = "*";

    @Column(name = "time_zone", length = 50)
    private String timeZone;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(name = "extra_schedules", columnDefinition = "TEXT")
    private String extraSchedules;

    @Column
    @Builder.Default
    private boolean manual = false;

    // Email fields
    @Column(name = "email_to", length = 2000)
    private String emailTo;

    @Column(name = "email_cc", length = 2000)
    private String emailCc;

    @Column(name = "email_bcc", length = 2000)
    private String emailBcc;

    @Column(name = "email_reply_to", length = 500)
    private String emailReplyTo;

    @Column(name = "email_from", length = 200)
    private String emailFrom;

    @Column(name = "email_subject", length = 500)
    private String emailSubject;

    @Column(name = "email_message", columnDefinition = "TEXT")
    private String emailMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "smtp_server_id")
    private SmtpServerEntity smtpServer;

    @Column(name = "dynamic_recipients_report_id")
    private Long dynamicRecipientsReportId;

    // Publish/Archive fields
    @Column(name = "runs_to_archive")
    @Builder.Default
    private Integer runsToArchive = 0;

    @Column(name = "allow_sharing")
    @Builder.Default
    private boolean allowSharing = false;

    @Column(name = "allow_splitting")
    @Builder.Default
    private boolean allowSplitting = false;

    @Column(name = "fixed_file_name", length = 200)
    private String fixedFileName;

    @Column(name = "sub_directory", length = 200)
    private String subDirectory;

    // Pre/Post actions
    @Column(name = "pre_run_report_ids", length = 500)
    private String preRunReportIds;

    @Column(name = "post_run_report_ids", length = 500)
    private String postRunReportIds;

    @Column(name = "batch_file", length = 200)
    private String batchFile;

    // Error handling
    @Column(name = "error_notification_email", length = 500)
    private String errorNotificationEmail;

    // Parameters (JSON)
    @Column(name = "parameter_values", columnDefinition = "TEXT")
    private String parameterValues;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
