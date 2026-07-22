package com.insighthub.execution;

/**
 * Represents a single binding value for a prepared statement placeholder,
 * combining the value to bind with its JDBC type.
 *
 * @param value    the value to bind (may be null)
 * @param jdbcType the JDBC type constant from {@link java.sql.Types}
 */
public record BindValue(Object value, int jdbcType) {
}
