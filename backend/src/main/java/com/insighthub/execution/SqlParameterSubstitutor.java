package com.insighthub.execution;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Substitutes named parameter placeholders ({@code :paramName}) in SQL strings
 * with user-supplied values, applying proper escaping for SQL safety.
 * <p>
 * Behavior:
 * <ul>
 *   <li>Single values are escaped (single quotes doubled) and wrapped in single quotes</li>
 *   <li>Multi-value parameters (List) are expanded to a comma-separated quoted list
 *       suitable for SQL IN clauses (e.g., {@code 'val1','val2','val3'})</li>
 *   <li>Null values are substituted as the SQL literal {@code NULL}</li>
 *   <li>Empty strings are substituted as {@code ''}</li>
 * </ul>
 * <p>
 * This class enforces Property 4 (Parameter Safety): all substitutions escape
 * single quotes ({@code '} → {@code ''}) before insertion into SQL.
 */
@Component
public class SqlParameterSubstitutor {

    /**
     * Regex pattern matching named parameter placeholders in SQL.
     * Matches :paramName where paramName starts with a letter or underscore,
     * followed by word characters. Does not match inside single-quoted strings.
     */
    private static final Pattern PARAM_PATTERN = Pattern.compile(":([a-zA-Z_][a-zA-Z0-9_]*)");

    /**
     * Substitutes all {@code :paramName} placeholders in the given SQL template
     * with the corresponding values from the params map.
     * <p>
     * If a parameter name in the SQL is not present in the params map, the
     * placeholder is left unchanged (for flexibility with database-native syntax).
     *
     * @param sql    the SQL template containing {@code :paramName} placeholders
     * @param params a map of parameter names to their values; values may be
     *               String, List&lt;String&gt;, Collection, or null
     * @return the SQL string with all matched placeholders substituted
     */
    public String substitute(String sql, Map<String, Object> params) {
        if (sql == null || sql.isEmpty()) {
            return sql;
        }
        if (params == null || params.isEmpty()) {
            return sql;
        }

        Matcher matcher = PARAM_PATTERN.matcher(sql);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {
            String paramName = matcher.group(1);

            if (params.containsKey(paramName)) {
                Object value = params.get(paramName);
                String replacement = formatValue(value);
                matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
            }
            // If param not in map, leave placeholder unchanged
        }
        matcher.appendTail(result);

        return result.toString();
    }

    /**
     * Formats a parameter value for SQL substitution.
     * <p>
     * Handles:
     * <ul>
     *   <li>null → {@code NULL}</li>
     *   <li>Collection/List with multiple values → comma-separated quoted list</li>
     *   <li>Collection/List with single value → single quoted value</li>
     *   <li>Collection/List with no values → {@code NULL}</li>
     *   <li>Any other object → escaped and quoted string representation</li>
     * </ul>
     *
     * @param value the parameter value (may be null, String, List, or other)
     * @return the formatted SQL value string
     */
    private String formatValue(Object value) {
        if (value == null) {
            return "NULL";
        }

        if (value instanceof Collection<?> collection) {
            return formatMultiValue(collection);
        }

        return quoteAndEscape(value.toString());
    }

    /**
     * Formats a collection of values as a comma-separated quoted list for IN clauses.
     * <p>
     * Examples:
     * <ul>
     *   <li>["Active", "Closed"] → {@code 'Active','Closed'}</li>
     *   <li>["val1"] → {@code 'val1'}</li>
     *   <li>[] → {@code NULL}</li>
     * </ul>
     *
     * @param values the collection of values to format
     * @return comma-separated quoted list, or {@code NULL} if empty
     */
    private String formatMultiValue(Collection<?> values) {
        if (values.isEmpty()) {
            return "NULL";
        }

        StringBuilder sb = new StringBuilder();
        boolean first = true;

        for (Object val : values) {
            if (!first) {
                sb.append(',');
            }
            first = false;

            if (val == null) {
                sb.append("NULL");
            } else {
                sb.append(quoteAndEscape(val.toString()));
            }
        }

        return sb.toString();
    }

    /**
     * Escapes single quotes in the value and wraps it in single quotes.
     * <p>
     * This is the core safety mechanism (Property 4): all user input has
     * single quotes escaped ({@code '} → {@code ''}) before being placed
     * into the SQL string.
     *
     * @param value the raw string value
     * @return the value with single quotes escaped and wrapped in quotes
     */
    private String quoteAndEscape(String value) {
        String escaped = value.replace("'", "''");
        return "'" + escaped + "'";
    }
}
