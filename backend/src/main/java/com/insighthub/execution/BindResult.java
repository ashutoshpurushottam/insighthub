package com.insighthub.execution;

import java.util.List;

/**
 * Result of SQL parameter binding, containing the processed SQL with all
 * {@code :paramName} placeholders replaced by {@code ?} positional parameters,
 * along with the ordered list of binding values.
 *
 * @param processedSql the SQL with all named placeholders replaced by {@code ?}
 * @param bindings     ordered list of {@link BindValue} objects corresponding to each {@code ?}
 */
public record BindResult(String processedSql, List<BindValue> bindings) {
}
