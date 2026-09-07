package com.insighthub.execution;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrillDownInfo {
    private String column;
    private Long childReportId;
    private String childReportName;

    @Builder.Default
    private List<ParamMapping> paramMappings = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParamMapping {
        private String parentColumnName;
        private String childParamName;
    }
}
