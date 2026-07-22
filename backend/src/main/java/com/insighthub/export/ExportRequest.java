package com.insighthub.export;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request body for export endpoints.
 * Contains the parameter values to substitute into the report SQL before export.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExportRequest {

    /**
     * Parameter name → value map for SQL parameter substitution.
     * Values may be String (single value) or List&lt;String&gt; (multi-value).
     */
    private Map<String, Object> params;
}
