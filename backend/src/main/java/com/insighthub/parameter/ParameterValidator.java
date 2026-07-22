package com.insighthub.parameter;

import com.insighthub.parameter.ParameterValidationException.ValidationError;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Validates user-supplied parameter values against their definitions before report execution.
 * <p>
 * Checks:
 * <ul>
 *   <li>Required parameters have non-empty values</li>
 *   <li>DATE parameters are parseable as yyyy-MM-dd</li>
 *   <li>DATETIME parameters are parseable as yyyy-MM-dd HH:mm:ss</li>
 *   <li>NUMBER parameters are valid numeric literals</li>
 * </ul>
 */
@Component
public class ParameterValidator {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Validates the user-supplied parameter values against the parameter definitions.
     *
     * @param parameterDefinitions the list of parameter definitions for the report
     * @param suppliedParams       the user-supplied parameter values (param name → value)
     * @throws ParameterValidationException if any validation errors are found
     */
    public void validate(List<ParameterEntity> parameterDefinitions, Map<String, Object> suppliedParams) {
        List<ValidationError> errors = new ArrayList<>();

        for (ParameterEntity param : parameterDefinitions) {
            String paramName = param.getName();
            Object value = suppliedParams != null ? suppliedParams.get(paramName) : null;
            String stringValue = toStringValue(value);

            // Required validation
            if (param.isRequired() && isBlank(stringValue)) {
                errors.add(new ValidationError(
                        "Parameter '" + paramName + "' is required",
                        paramName
                ));
                continue; // Skip type validation if required field is empty
            }

            // Type validation only if value is present
            if (!isBlank(stringValue)) {
                String paramType = param.getParamType();
                if (paramType != null) {
                    switch (paramType.toUpperCase()) {
                        case "DATE" -> validateDate(paramName, stringValue, errors);
                        case "DATETIME" -> validateDateTime(paramName, stringValue, errors);
                        case "NUMBER" -> validateNumber(paramName, stringValue, errors);
                        default -> { /* TEXT, BOOLEAN, DROPDOWN — no format validation */ }
                    }
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new ParameterValidationException(errors);
        }
    }

    private void validateDate(String paramName, String value, List<ValidationError> errors) {
        try {
            LocalDate.parse(value, DATE_FORMAT);
        } catch (DateTimeParseException e) {
            errors.add(new ValidationError(
                    "Parameter '" + paramName + "' must be a valid date in format yyyy-MM-dd",
                    paramName
            ));
        }
    }

    private void validateDateTime(String paramName, String value, List<ValidationError> errors) {
        try {
            LocalDateTime.parse(value, DATETIME_FORMAT);
        } catch (DateTimeParseException e) {
            errors.add(new ValidationError(
                    "Parameter '" + paramName + "' must be a valid datetime in format yyyy-MM-dd HH:mm:ss",
                    paramName
            ));
        }
    }

    private void validateNumber(String paramName, String value, List<ValidationError> errors) {
        try {
            Double.parseDouble(value);
        } catch (NumberFormatException e) {
            errors.add(new ValidationError(
                    "Parameter '" + paramName + "' must be a valid number",
                    paramName
            ));
        }
    }

    /**
     * Converts a parameter value to its string representation.
     * Handles List values (multi-value params) by checking if the list is empty.
     */
    private String toStringValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof List<?> list) {
            return list.isEmpty() ? null : list.stream()
                    .map(Object::toString)
                    .reduce((a, b) -> a + "," + b)
                    .orElse(null);
        }
        String str = value.toString();
        return str.isEmpty() ? null : str;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
