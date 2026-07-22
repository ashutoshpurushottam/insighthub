package com.insighthub.execution;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Processes {@code $x{comparator,column_name,parameter_name}} tokens in SQL,
 * replacing them with appropriate SQL fragments and collecting ordered binding values.
 * <p>
 * Supported comparators (case-sensitive):
 * <ul>
 *   <li>{@code in} — generates {@code column IN (?,?,...)}</li>
 *   <li>{@code notin} — generates {@code column NOT IN (?,?,...)}</li>
 *   <li>{@code equal} — generates {@code column = ?} or {@code column IS NULL}</li>
 *   <li>{@code notequal} — generates {@code column <> ?} or {@code column IS NOT NULL}</li>
 * </ul>
 * <p>
 * This processor runs before prepared statement binding, replacing {@code $x{...}} blocks
 * with the appropriate SQL fragments and parameter bindings.
 * <p>
 * Parameter names are case-sensitive as specified in Requirement 7.
 */
@Component
public class XParameterProcessor {

    /**
     * Regex pattern matching {@code $x{comparator,column_name,parameter_name}} tokens.
     * <p>
     * Groups:
     * <ol>
     *   <li>comparator (e.g., in, notin, equal, notequal)</li>
     *   <li>column_name (e.g., product_name, region)</li>
     *   <li>parameter_name (e.g., products, region_param)</li>
     * </ol>
     */
    static final Pattern X_PARAM_PATTERN = Pattern.compile(
            "\\$x\\{\\s*([^,]+?)\\s*,\\s*([^,]+?)\\s*,\\s*([^}]+?)\\s*\\}");

    /**
     * Valid comparators for x-parameter syntax (case-sensitive).
     */
    private static final Set<String> VALID_COMPARATORS = Set.of("in", "notin", "equal", "notequal");

    /**
     * Processes all {@code $x{...}} tokens in the given SQL, resolving parameter values
     * from the provided params map and generating appropriate SQL fragments with bindings.
     *
     * @param sql    the SQL string potentially containing {@code $x{...}} tokens
     * @param params a map of parameter names to their values; values may be single objects
     *               or Collections for multi-value parameters
     * @return an {@link XParameterResult} containing the processed SQL and ordered bindings
     * @throws IllegalArgumentException if a parameter name referenced in an {@code $x{...}}
     *                                  block is not found in the params map, or if the
     *                                  comparator is not valid
     */
    public XParameterResult process(String sql, Map<String, Object> params) {
        if (sql == null || sql.isEmpty()) {
            return new XParameterResult(sql, Collections.emptyList());
        }
        if (params == null) {
            params = Collections.emptyMap();
        }

        Matcher matcher = X_PARAM_PATTERN.matcher(sql);
        StringBuilder result = new StringBuilder();
        List<Object> bindings = new ArrayList<>();

        while (matcher.find()) {
            String comparator = matcher.group(1);
            String columnName = matcher.group(2);
            String paramName = matcher.group(3);

            validateComparator(comparator);
            validateParameterExists(paramName, params);

            Object value = params.get(paramName);
            String sqlFragment = buildSqlFragment(comparator, columnName, value, bindings);

            matcher.appendReplacement(result, Matcher.quoteReplacement(sqlFragment));
        }
        matcher.appendTail(result);

        return new XParameterResult(result.toString(), bindings);
    }

    /**
     * Validates that the comparator is one of the supported values.
     *
     * @param comparator the comparator to validate
     * @throws IllegalArgumentException if the comparator is not valid
     */
    private void validateComparator(String comparator) {
        if (!VALID_COMPARATORS.contains(comparator)) {
            throw new IllegalArgumentException(
                    "Invalid x-parameter comparator '" + comparator + "'. " +
                            "Supported comparators: " + VALID_COMPARATORS);
        }
    }

    /**
     * Validates that the parameter name exists in the params map.
     * Parameter names are case-sensitive as per Requirement 7.
     *
     * @param paramName the parameter name to validate
     * @param params    the params map to check against
     * @throws IllegalArgumentException if the parameter name is not found
     */
    private void validateParameterExists(String paramName, Map<String, Object> params) {
        if (!params.containsKey(paramName)) {
            throw new IllegalArgumentException(
                    "$x references unknown parameter '" + paramName + "'");
        }
    }

    /**
     * Builds the SQL fragment for a given comparator, column, and parameter value.
     * Also populates the bindings list with the appropriate values.
     * <p>
     * Delegates to comparator-specific methods for actual SQL generation.
     *
     * @param comparator the comparator (in, notin, equal, notequal)
     * @param columnName the column name to use in the SQL fragment
     * @param value      the parameter value (may be null, a single value, or a Collection)
     * @param bindings   the bindings list to append values to
     * @return the generated SQL fragment
     */
    private String buildSqlFragment(String comparator, String columnName, Object value, List<Object> bindings) {
        return switch (comparator) {
            case "in" -> buildInFragment(columnName, value, bindings);
            case "notin" -> buildNotInFragment(columnName, value, bindings);
            case "equal" -> buildEqualFragment(columnName, value, bindings);
            case "notequal" -> buildNotEqualFragment(columnName, value, bindings);
            default -> throw new IllegalArgumentException("Unsupported comparator: " + comparator);
        };
    }

    /**
     * Builds SQL fragment for the {@code in} comparator.
     * <p>
     * With values ["A","B"] → {@code column IN (?,?)} + bindings ["A","B"]
     * With empty values → {@code 1=0} (always false)
     */
    private String buildInFragment(String columnName, Object value, List<Object> bindings) {
        List<Object> values = toList(value);
        if (values.isEmpty()) {
            return "1=0";
        }
        bindings.addAll(values);
        String placeholders = String.join(",", Collections.nCopies(values.size(), "?"));
        return columnName + " IN (" + placeholders + ")";
    }

    /**
     * Builds SQL fragment for the {@code notin} comparator.
     * <p>
     * With values ["A","B"] → {@code column NOT IN (?,?)} + bindings ["A","B"]
     * With empty values → {@code 1=1} (always true)
     */
    private String buildNotInFragment(String columnName, Object value, List<Object> bindings) {
        List<Object> values = toList(value);
        if (values.isEmpty()) {
            return "1=1";
        }
        bindings.addAll(values);
        String placeholders = String.join(",", Collections.nCopies(values.size(), "?"));
        return columnName + " NOT IN (" + placeholders + ")";
    }

    /**
     * Builds SQL fragment for the {@code equal} comparator.
     * <p>
     * With value "X" → {@code column = ?} + binding "X"
     * With NULL → {@code column IS NULL} (no binding)
     */
    private String buildEqualFragment(String columnName, Object value, List<Object> bindings) {
        if (value == null) {
            return columnName + " IS NULL";
        }
        bindings.add(value);
        return columnName + " = ?";
    }

    /**
     * Builds SQL fragment for the {@code notequal} comparator.
     * <p>
     * With value "X" → {@code column <> ?} + binding "X"
     * With NULL → {@code column IS NOT NULL} (no binding)
     */
    private String buildNotEqualFragment(String columnName, Object value, List<Object> bindings) {
        if (value == null) {
            return columnName + " IS NOT NULL";
        }
        bindings.add(value);
        return columnName + " <> ?";
    }

    /**
     * Converts a parameter value to a List for multi-value processing.
     * <p>
     * If the value is already a Collection, it is converted to a List.
     * If it is a single value, it is wrapped in a single-element list.
     * If it is null, an empty list is returned.
     *
     * @param value the parameter value
     * @return a List representation of the value
     */
    private List<Object> toList(Object value) {
        if (value == null) {
            return Collections.emptyList();
        }
        if (value instanceof Collection<?> collection) {
            return new ArrayList<>(collection);
        }
        return List.of(value);
    }
}
