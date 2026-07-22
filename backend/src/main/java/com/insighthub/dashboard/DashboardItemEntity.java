package com.insighthub.dashboard;

import com.insighthub.report.ReportEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "dashboard_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dashboard_id", nullable = false)
    private DashboardEntity dashboard;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private ReportEntity report;

    @Column(length = 100)
    private String title;

    @Column(nullable = false)
    private int position;

    @Column(name = "col_span", nullable = false)
    @Builder.Default
    private int colSpan = 1;

    @Column(name = "row_span", nullable = false)
    @Builder.Default
    private int rowSpan = 1;
}
