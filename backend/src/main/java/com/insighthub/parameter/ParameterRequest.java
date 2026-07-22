package com.insighthub.parameter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ParameterRequest {

    @NotBlank(message = "Parameter name is required")
    @Size(max = 100)
    private String name;

    @Size(max = 100)
    private String label;

    /**
     * Accepts both "type" and "paramType" from JSON — frontend sends "type".
     */
    @NotBlank(message = "Parameter type is required")
    private String type;

    @Size(max = 500)
    private String defaultValue;

    @Size(max = 200)
    private String placeholder;

    private boolean required;

    private int position;

    // --- LOV fields ---

    private String lovType;

    private String lovQuery;

    private List<LovOptionEntry> lovStaticValues;

    private Long parentParamId;

    private boolean multiValue;

    private String dateRangePair;

    // --- Parameter enhancement fields ---

    /**
     * When true, the parameter is not displayed to users but still participates
     * in SQL substitution with its default or fixed values.
     */
    private boolean hidden;

    /**
     * When true, a "NULL" checkbox is rendered next to the parameter input,
     * allowing users to pass NULL as the parameter value.
     */
    private boolean allowNull;

    /**
     * For DATERANGE type: the name of the parameter that receives the from-date value.
     */
    @Size(max = 100)
    private String fromParameterName;

    /**
     * For DATERANGE type: the name of the parameter that receives the to-date value.
     */
    @Size(max = 100)
    private String toParameterName;

    /**
     * Nested class for static LOV value/label pairs.
     */
    @Data
    public static class LovOptionEntry {
        private String value;
        private String label;
    }
}
