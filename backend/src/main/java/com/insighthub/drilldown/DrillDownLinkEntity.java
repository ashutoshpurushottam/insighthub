package com.insighthub.drilldown;

import com.insighthub.report.ReportEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "drill_down_links", indexes = {
        @Index(name = "idx_ddl_parent_report", columnList = "parent_report_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrillDownLinkEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The parent report from which drill-down navigation originates.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_report_id", nullable = false)
    private ReportEntity parentReport;

    /**
     * The child report that is navigated to on drill-down click.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_report_id", nullable = false)
    private ReportEntity childReport;

    /**
     * The column name in the parent report results that triggers the drill-down navigation.
     */
    @Column(name = "trigger_column", nullable = false, length = 100)
    private String triggerColumn;

    /**
     * Display position/ordering of the drill-down link.
     */
    @Column(name = "position")
    @Builder.Default
    private int position = 0;

    /**
     * Parameter mappings defining how parent column values map to child report parameters.
     * Cascades all operations and removes orphaned mappings.
     */
    @OneToMany(mappedBy = "drillDownLink", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DrillDownParamMappingEntity> paramMappings = new ArrayList<>();
}
