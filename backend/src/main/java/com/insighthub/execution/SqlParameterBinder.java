package com.insighthub.execution;

import org.springframework.stereotype.Component;

import java.sql.Types;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Converts named parameter placeholders ({@code :paramName}) in SQL strings
 * into positional {@code ?} parameters suitable for JDBC {@code PreparedStatement} binding.
 * <p>
 * Key behaviors:
 * <ul>
 *   <li>Single values: {@code :paramName} → {@code ?} with one binding</li>
 *   <li>Multi-value (Collection): {@code :paramName} → {@code ?,?,?} (N placeholders) with N bindings</li>
 *   <li>Determines JDBC type from the parameter's declared type string</li>
 *   <li>Does not match {@code ::} (PostgreSQL cast syntax)</li>
 *   <li>Does not match {@code :paramName} inside single-quoted strings</li>
 * </ul>
 * <p>
 * Validates: Requirements 5
 */
@Component
public class SqlParameterBinder {

    /**
     * Regex pattern matching named parameter placeholders in SQL.
     * <p>
     * Matches {@code :paramName} where:
     * <ul>
     *   <li>Not preceded by another colon (avoids {@code ::} PostgreSQL cast syntax)</li>
     *   <li>paramName starts with a letter or underscore, followed by word characters</li>
     * </ul>
     * <p>
     * Note: This pattern is used in conjunction with quote-aware scanning to avoid
     * matching placeholders inside single-quoted string literals.
     */
    private static final Pattern PARAM_PATTERN = Pattern.compile(
            "(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)");

    /**
     * Binds named parameters in the given SQL to positional {@code ?} placeholders,
     * building an ordered list of {@link BindValue} objects for PreparedStatement binding.
     *
     * @param sql        the SQL string containing {@code :paramName} placeholders
     * @param params     a map of parameter names to their values; values may be single objects
     *                   or Collections for multi-value parameters. May be null or empty.
     * @param paramTypes a map of parameter names to their declared type strings
     *                   (e.g., "TEXT", "NUMBER", "DATE", "DATETIME", "BOOLEAN", "DROPDOWN").
     *                   May be null or empty; defaults to VARCHAR if type is unknown.
     * @return a {@link BindResult} containing the processed SQL and ordered bindings
     */
    public BindResult bind(String sql, Map<String, Object> params, Map<String, String> paramTypes) {
        if (sql == null || sql.isEmpty()) {
            return new BindResult(sql, Collections.emptyList());
        }
        if (params == null) {
            params = Collections.emptyMap();
        }
        if (paramTypes == null) {
            paramTypes = Collections.emptyMap();
        }

        List<BindValue> bindings = new ArrayList<>();
        String processedSql = processWithQuoteAwareness(sql, params, paramTypes, bindings);

        return new BindResult(processedSql, bindings);
    }

    /**
     * Processes the SQL string with awareness of single-quoted string literals,
     * ensuring that parameter placeholders inside quotes are not replaced.
     * <p>
     * Splits the SQL into quoted and unquoted segments. Only unquoted segments
     * have their parameter placeholders processed.
     *
     * @param sql        the full SQL string
     * @param params     parameter name → value map
     * @param paramTypes parameter name → type string map
     * @param bindings   accumulator for binding values (mutated)
     * @return the processed SQL with placeholders replaced
     */
    private String processWithQuoteAwareness(String sql, Map<String, Object> params,
                                              Map<String, String> paramTypes,
                                              List<BindValue> bindings) {
        StringBuilder result = new StringBuilder();
        int len = sql.length();
        int i = 0;

        while (i < len) {
            char c = sql.charAt(i);

            if (c == '\'') {
                // Inside a single-quoted string — copy verbatim until the closing quote
                int end = findClosingQuote(sql, i);
                result.append(sql, i, end);
                i = end;
            } else {
                // Unquoted segment — find the next quote or end of string
                int nextQuote = sql.indexOf('\'', i);
                if (nextQuote == -1) {
                    nextQuote = len;
                }
                String segment = sql.substring(i, nextQuote);
                result.append(replaceParamsInSegment(segment, params, paramTypes, bindings));
                i = nextQuote;
            }
        }

        return result.toString();
    }

    /**
     * Finds the end of a single-quoted string literal, handling escaped quotes ({@code ''}).
     *
     * @param sql   the SQL string
     * @param start the index of the opening quote character
     * @return the index just past the closing quote
     */
    private int findClosingQuote(String sql, int start) {
        int len = sql.length();
        int i = start + 1; // skip the opening quote

        while (i < len) {
            if (sql.charAt(i) == '\'') {
                // Check for escaped quote ('')
                if (i + 1 < len && sql.charAt(i + 1) == '\'') {
                    i += 2; // skip the escaped quote pair
                } else {
                    return i + 1; // past the closing quote
                }
            } else {
                i++;
            }
        }

        // Unterminated string — return to end of SQL
        return len;
    }

    /**
     * Replaces all {@code :paramName} placeholders in an unquoted SQL segment
     * with {@code ?} placeholders and populates the bindings list.
     *
     * @param segment    an unquoted segment of SQL
     * @param params     parameter name → value map
     * @param paramTypes parameter name → type string map
     * @param bindings   accumulator for binding values (mutated)
     * @return the segment with placeholders replaced
     */
    private String replaceParamsInSegment(String segment, Map<String, Object> params,
                                          Map<String, String> paramTypes,
                                          List<BindValue> bindings) {
        Matcher matcher = PARAM_PATTERN.matcher(segment);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {
            String paramName = matcher.group(1);

            if (params.containsKey(paramName)) {
                Object value = params.get(paramName);
                String declaredType = paramTypes.getOrDefault(paramName, "TEXT");
                int jdbcType = mapToJdbcType(declaredType);

                String replacement = buildPlaceholdersAndBindings(value, jdbcType, bindings);
                matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
            }
            // If param not in map, leave placeholder unchanged
        }
        matcher.appendTail(result);

        return result.toString();
    }

    /**
     * Builds the {@code ?} placeholder string for a parameter value and adds
     * the corresponding {@link BindValue}(s) to the bindings list.
     * <p>
     * For multi-value (Collection) parameters, expands to {@code ?,?,?} with
     * one binding per element. For single values, produces a single {@code ?}.
     *
     * @param value    the parameter value (may be null, a single object, or a Collection)
     * @param jdbcType the JDBC type to assign to each binding
     * @param bindings the list to append bindings to
     * @return the placeholder string (e.g., {@code "?"} or {@code "?,?,?"})
     */
    private String buildPlaceholdersAndBindings(Object value, int jdbcType, List<BindValue> bindings) {
        if (value instanceof Collection<?> collection) {
            if (collection.isEmpty()) {
                // Bind a single NULL for an empty collection
                bindings.add(new BindValue(null, jdbcType));
                return "?";
            }
            StringJoiner joiner = new StringJoiner(",");
            for (Object item : collection) {
                bindings.add(new BindValue(item, jdbcType));
                joiner.add("?");
            }
            return joiner.toString();
        }

        // Single value (including null)
        bindings.add(new BindValue(value, jdbcType));
        return "?";
    }

    /**
     * Maps a declared parameter type string to the corresponding JDBC type constant
     * from {@link java.sql.Types}.
     * <p>
     * Mapping:
     * <ul>
     *   <li>TEXT, DROPDOWN → {@link Types#VARCHAR}</li>
     *   <li>NUMBER → {@link Types#DOUBLE}</li>
     *   <li>DATE → {@link Types#DATE}</li>
     *   <li>DATETIME → {@link Types#TIMESTAMP}</li>
     *   <li>BOOLEAN → {@link Types#BOOLEAN}</li>
     *   <li>default → {@link Types#VARCHAR}</li>
     * </ul>
     *
     * @param declaredType the declared parameter type string (case-insensitive)
     * @return the corresponding JDBC type constant
     */
    int mapToJdbcType(String declaredType) {
        if (declaredType == null) {
            return Types.VARCHAR;
        }
        return switch (declaredType.toUpperCase()) {
            case "TEXT", "DROPDOWN" -> Types.VARCHAR;
            case "NUMBER" -> Types.DOUBLE;
            case "DATE" -> Types.DATE;
            case "DATETIME" -> Types.TIMESTAMP;
            case "BOOLEAN" -> Types.BOOLEAN;
            default -> Types.VARCHAR;
        };
    }
}
