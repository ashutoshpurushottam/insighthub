package com.insighthub.guardrails;

import com.insighthub.report.ReportEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "guardrails_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuardrailsConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Optional report reference. NULL means this is the global default configuration.
     * Non-NULL means this is a per-report override.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", unique = true)
    private ReportEntity report;

    /**
     * Maximum number of rows returned in a paginated execution result.
     */
    @Column(name = "max_rows")
    @Builder.Default
    private int maxRows = 10000;

    /**
     * Maximum number of rows allowed in an export operation.
     */
    @Column(name = "max_export_rows")
    @Builder.Default
    private int maxExportRows = 100000;

    /**
     * Maximum allowed date range in days between FROM and TO date parameters.
     */
    @Column(name = "max_date_range_days")
    @Builder.Default
    private int maxDateRangeDays = 365;

    /**
     * Maximum query execution time in seconds before timeout.
     */
    @Column(name = "execution_timeout_seconds")
    @Builder.Default
    private int executionTimeoutSeconds = 60;

    /**
     * Maximum number of concurrent report executions per user.
     */
    @Column(name = "max_concurrent_per_user")
    @Builder.Default
    private int maxConcurrentPerUser = 3;

    /**
     * Maximum result set size in bytes (default 50MB).
     */
    @Column(name = "max_result_size_bytes")
    @Builder.Default
    private long maxResultSizeBytes = 52428800L;
}
