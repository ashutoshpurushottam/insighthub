package com.insighthub.drilldown;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "drill_down_param_mappings", indexes = {
        @Index(name = "idx_ddpm_link", columnList = "drill_down_link_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrillDownParamMappingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The drill-down link this mapping belongs to.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "drill_down_link_id", nullable = false)
    private DrillDownLinkEntity drillDownLink;

    /**
     * The column name from the parent report whose value is passed to the child.
     */
    @Column(name = "parent_column_name", nullable = false, length = 100)
    private String parentColumnName;

    /**
     * The parameter name on the child report that receives the parent column value.
     */
    @Column(name = "child_param_name", nullable = false, length = 100)
    private String childParamName;
}
