package com.insighthub.job.scheduler;

import java.util.Map;

/**
 * Represents a single dynamic recipient resolved from a dynamic recipients report.
 *
 * @param email   the email address (extracted from the first column of the query result)
 * @param columns all column values from the recipient row, keyed by column name (lowercase),
 *                usable as personalization placeholders (#column_name#) in email subject/body
 */
public record DynamicRecipient(String email, Map<String, String> columns) {

    /**
     * Returns the value for a given column name, or empty string if not present.
     */
    public String getColumnValue(String columnName) {
        if (columns == null || columnName == null) {
            return "";
        }
        return columns.getOrDefault(columnName.toLowerCase(), "");
    }

    /**
     * Whether this recipient has filtering information (recipient_column and recipient_id).
     */
    public boolean hasFilterInfo() {
        return columns != null
                && columns.containsKey("recipient_column")
                && columns.containsKey("recipient_id");
    }

    /**
     * Returns the recipient_column value (the column name to filter on in the main report).
     */
    public String getRecipientColumn() {
        return getColumnValue("recipient_column");
    }

    /**
     * Returns the recipient_id value (the value to filter by for this recipient).
     */
    public String getRecipientId() {
        return getColumnValue("recipient_id");
    }
}
