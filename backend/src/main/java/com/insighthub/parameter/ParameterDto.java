package com.insighthub.parameter;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ParameterDto {
    private Long id;
    private Long reportId;
    private String name;
    private String label;
    /**
     * Serialized as "type" in JSON to match frontend TypeScript interface.
     */
    private String type;
    private String defaultValue;
    private String resolvedDefaultValue;
    private String placeholder;
    private boolean required;
    private int position;
    private String lovType;
    private String lovQuery;
    private List<LovOptionDto> lovStaticValues;
    private Long parentParamId;
    private boolean multiValue;
    private String dateRangePair;

    // --- Parameter enhancement fields ---
    private boolean hidden;
    private boolean allowNull;
    private String fromParameterName;
    private String toParameterName;

    @Data
    @Builder
    public static class LovOptionDto {
        private String value;
        private String label;
    }
}
