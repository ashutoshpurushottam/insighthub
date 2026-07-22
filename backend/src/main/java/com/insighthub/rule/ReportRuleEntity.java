package com.insighthub.rule;

import com.insighthub.report.ReportEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "report_rules",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_rr",
        columnNames = {"report_id", "rule_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private ReportEntity report;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private RuleEntity rule;

    @Column(name = "column_name", nullable = false, length = 200)
    private String columnName;
}
