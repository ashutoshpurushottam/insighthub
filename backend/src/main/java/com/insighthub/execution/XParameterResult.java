package com.insighthub.execution;

import java.util.List;

/**
 * Result of X-parameter processing, containing the transformed SQL
 * and ordered binding values for prepared statement execution.
 *
 * @param processedSql the SQL with all {@code $x{...}} blocks replaced by SQL fragments
 * @param bindings     ordered list of binding values corresponding to {@code ?} placeholders
 */
public record XParameterResult(String processedSql, List<Object> bindings) {
}
