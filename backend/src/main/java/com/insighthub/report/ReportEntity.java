package com.insighthub.report;

import com.insighthub.datasource.DatasourceEntity;
import com.insighthub.reportgroup.ReportGroupEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 254)
    private String shortDescription;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private int reportType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_group_id")
    private ReportGroupEntity reportGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "datasource_id")
    private DatasourceEntity datasource;

    @Column(length = 100)
    private String contactPerson;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean hidden = false;

    @Column(name = "use_prepared_statements", nullable = false)
    private boolean usePreparedStatements = true;

    @Column(name = "uses_rules", nullable = false)
    private boolean usesRules = false;

    @Column(columnDefinition = "TEXT")
    private String reportSource;

    @Column(length = 50)
    private String defaultReportFormat;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(length = 50)
    private String createdBy;

    @Column(length = 50)
    private String updatedBy;
}
