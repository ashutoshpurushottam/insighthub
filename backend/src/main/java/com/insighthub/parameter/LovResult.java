package com.insighthub.parameter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Result of LOV (List-of-Values) resolution for a parameter.
 * Contains the list of options and an optional error message if resolution failed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LovResult {

    private List<LovOption> options;

    /**
     * True if LOV resolution encountered an error (e.g., query failure).
     * When true, options will be an empty list and errorMessage will contain details.
     */
    private boolean error;

    /**
     * Error message describing why LOV resolution failed. Null on success.
     */
    private String errorMessage;

    /**
     * Creates a successful LOV result with the given options.
     */
    public static LovResult success(List<LovOption> options) {
        return LovResult.builder()
            .options(options)
            .error(false)
            .errorMessage(null)
            .build();
    }

    /**
     * Creates an error LOV result with an empty options list and error details.
     */
    public static LovResult error(String message) {
        return LovResult.builder()
            .options(List.of())
            .error(true)
            .errorMessage(message)
            .build();
    }
}
