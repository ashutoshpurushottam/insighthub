package com.insighthub.drilldown;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request DTO for creating a new drill-down link on a parent report.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDrillDownRequest {

    /**
     * The ID of the child report to navigate to on drill-down.
     */
    private Long childReportId;

    /**
     * The column name in the parent report results that triggers the drill-down.
     */
    private String triggerColumn;

    /**
     * Display ordering position of the drill-down link.
     */
    private int position;

    /**
     * Parameter mappings: parent column name → child parameter name.
     */
    private Map<String, String> paramMappings;
}
