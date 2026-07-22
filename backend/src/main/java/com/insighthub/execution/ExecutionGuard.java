package com.insighthub.execution;

import com.insighthub.guardrails.GuardrailsConfigEntity;
import com.insighthub.guardrails.GuardrailsService;
import com.insighthub.parameter.ParameterEntity;
import com.insighthub.parameter.ParameterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Pre-execution guardrail checks.
 * Validates date range parameters against the configured max_date_range_days limit.
 * Identifies date range pairs by:
 * 1. The date_range_pair column on ParameterEntity ('FROM' / 'TO')
 * 2. Suffix convention: parameter names ending with _from/_to or _start/_end
 */
@Component
@RequiredArgsConstructor
public class ExecutionGuard {

    private final GuardrailsService guardrailsService;
    private final ParameterRepository parameterRepository;

    /**
     * Validates all pre-execution guardrails for the given report and parameters.
     * Throws IllegalArgumentException if any guardrail is violated.
     *
     * @param reportId the report being executed
     * @param params   the user-supplied parameter values (param name → value)
     */
    public void validate(Long reportId, Map<String, Object> params) {
        List<String> violations = checkAll(reportId, params);
        if (!violations.isEmpty()) {
            throw new IllegalArgumentException(violations.get(0));
        }
    }

    /**
     * Checks all guardrails and returns a list of violation messages.
     * Returns an empty list if all guardrails pass.
     *
     * @param reportId the report being executed
     * @param params   the user-supplied parameter values (param name → value)
     * @return list of descriptive error messages for each violation
     */
    public List<String> checkAll(Long reportId, Map<String, Object> params) {
        List<String> violations = new ArrayList<>();

        if (params == null || params.isEmpty()) {
            return violations;
        }

        GuardrailsConfigEntity guardrails = guardrailsService.getEffectiveGuardrails(reportId);
        int maxDateRangeDays = guardrails.getMaxDateRangeDays();

        List<ParameterEntity> parameters = parameterRepository.findByReportIdOrderByPositionAsc(reportId);

        // Check date range pairs defined via date_range_pair column
        violations.addAll(checkExplicitDateRangePairs(parameters, params, maxDateRangeDays));

        // Check date range pairs defined via suffix convention (_from/_to, _start/_end)
        violations.addAll(checkSuffixDateRangePairs(parameters, params, maxDateRangeDays));

        return violations;
    }

    /**
     * Checks date range pairs identified by the date_range_pair column ('FROM'/'TO').
     * Matches FROM and TO parameters that share the same base name prefix before the pair marker.
     */
    private List<String> checkExplicitDateRangePairs(List<ParameterEntity> parameters,
                                                     Map<String, Object> params,
                                                     int maxDateRangeDays) {
        List<String> violations = new ArrayList<>();

        ParameterEntity fromParam = null;
        ParameterEntity toParam = null;

        for (ParameterEntity param : parameters) {
            if ("FROM".equalsIgnoreCase(param.getDateRangePair())) {
                fromParam = param;
            } else if ("TO".equalsIgnoreCase(param.getDateRangePair())) {
                toParam = param;
            }
        }

        if (fromParam != null && toParam != null) {
            String fromValue = getParamStringValue(params, fromParam.getName());
            String toValue = getParamStringValue(params, toParam.getName());

            String violation = validateDateRange(fromValue, toValue, maxDateRangeDays);
            if (violation != null) {
                violations.add(violation);
            }
        }

        return violations;
    }

    /**
     * Checks date range pairs identified by suffix convention.
     * Matches parameters whose names end with _from/_to or _start/_end.
     */
    private List<String> checkSuffixDateRangePairs(List<ParameterEntity> parameters,
                                                   Map<String, Object> params,
                                                   int maxDateRangeDays) {
        List<String> violations = new ArrayList<>();
        List<String> checkedPairs = new ArrayList<>();

        for (ParameterEntity param : parameters) {
            // Skip parameters already checked via explicit date_range_pair
            if (param.getDateRangePair() != null) {
                continue;
            }

            String name = param.getName();
            String baseName = null;
            String suffixType = null;

            if (name.endsWith("_from")) {
                baseName = name.substring(0, name.length() - "_from".length());
                suffixType = "from_to";
            } else if (name.endsWith("_start")) {
                baseName = name.substring(0, name.length() - "_start".length());
                suffixType = "start_end";
            }

            if (baseName == null) {
                continue;
            }

            // Find the matching counterpart
            String counterpartName = suffixType.equals("from_to")
                    ? baseName + "_to"
                    : baseName + "_end";

            // Avoid checking the same pair twice
            String pairKey = baseName + ":" + suffixType;
            if (checkedPairs.contains(pairKey)) {
                continue;
            }

            // Find counterpart in parameters list
            boolean counterpartExists = parameters.stream()
                    .anyMatch(p -> p.getName().equals(counterpartName) && p.getDateRangePair() == null);

            if (counterpartExists) {
                checkedPairs.add(pairKey);

                String fromValue = getParamStringValue(params, name);
                String toValue = getParamStringValue(params, counterpartName);

                String violation = validateDateRange(fromValue, toValue, maxDateRangeDays);
                if (violation != null) {
                    violations.add(violation);
                }
            }
        }

        return violations;
    }

    /**
     * Validates that the date range between fromValue and toValue does not exceed maxDays.
     * Returns an error message if the guardrail is violated, or null if valid.
     */
    private String validateDateRange(String fromValue, String toValue, int maxDays) {
        if (fromValue == null || toValue == null) {
            return null;
        }

        if (fromValue.isBlank() || toValue.isBlank()) {
            return null;
        }

        try {
            LocalDate fromDate = LocalDate.parse(fromValue.trim());
            LocalDate toDate = LocalDate.parse(toValue.trim());

            long daysBetween = ChronoUnit.DAYS.between(fromDate, toDate);

            if (daysBetween < 0) {
                daysBetween = Math.abs(daysBetween);
            }

            if (daysBetween > maxDays) {
                return "Date range exceeds maximum of " + maxDays + " days";
            }
        } catch (DateTimeParseException e) {
            // If dates can't be parsed, skip date range validation
            // (ParameterValidator handles format validation separately)
            return null;
        }

        return null;
    }

    /**
     * Extracts the string value of a parameter from the params map.
     */
    private String getParamStringValue(Map<String, Object> params, String paramName) {
        Object value = params.get(paramName);
        if (value == null) {
            return null;
        }
        return value.toString();
    }
}
