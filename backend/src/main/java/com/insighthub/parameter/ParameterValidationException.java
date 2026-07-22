package com.insighthub.parameter;

import lombok.Getter;

import java.util.List;

/**
 * Exception thrown when parameter validation fails during report execution.
 * Contains structured validation errors with field names for clear client feedback.
 */
@Getter
public class ParameterValidationException extends RuntimeException {

    private final List<ValidationError> errors;

    public ParameterValidationException(List<ValidationError> errors) {
        super("Parameter validation failed");
        this.errors = errors;
    }

    public ParameterValidationException(ValidationError error) {
        this(List.of(error));
    }

    /**
     * Structured validation error with a human-readable message and the field name.
     */
    public record ValidationError(String message, String field) {
    }
}
