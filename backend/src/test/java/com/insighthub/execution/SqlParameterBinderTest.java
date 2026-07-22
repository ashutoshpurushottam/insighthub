package com.insighthub.execution;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Types;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class SqlParameterBinderTest {

    private SqlParameterBinder binder;

    @BeforeEach
    void setUp() {
        binder = new SqlParameterBinder();
    }

    @Test
    void bind_singleParameter_replacesWithQuestionMark() {
        String sql = "SELECT * FROM t WHERE col = :status";
        Map<String, Object> params = Map.of("status", "Active");
        Map<String, String> paramTypes = Map.of("status", "TEXT");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE col = ?", result.processedSql());
        assertEquals(1, result.bindings().size());
        assertEquals("Active", result.bindings().get(0).value());
        assertEquals(Types.VARCHAR, result.bindings().get(0).jdbcType());
    }

    @Test
    void bind_multipleParameters_replacesAllInOrder() {
        String sql = "SELECT * FROM t WHERE col = :status AND dt > :start_date";
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("status", "Active");
        params.put("start_date", "2024-01-01");
        Map<String, String> paramTypes = Map.of("status", "TEXT", "start_date", "DATE");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE col = ? AND dt > ?", result.processedSql());
        assertEquals(2, result.bindings().size());
        assertEquals("Active", result.bindings().get(0).value());
        assertEquals(Types.VARCHAR, result.bindings().get(0).jdbcType());
        assertEquals("2024-01-01", result.bindings().get(1).value());
        assertEquals(Types.DATE, result.bindings().get(1).jdbcType());
    }

    @Test
    void bind_multiValueParameter_expandsToMultiplePlaceholders() {
        String sql = "SELECT * FROM t WHERE col IN (:items)";
        Map<String, Object> params = Map.of("items", List.of("A", "B", "C"));
        Map<String, String> paramTypes = Map.of("items", "TEXT");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE col IN (?,?,?)", result.processedSql());
        assertEquals(3, result.bindings().size());
        assertEquals("A", result.bindings().get(0).value());
        assertEquals("B", result.bindings().get(1).value());
        assertEquals("C", result.bindings().get(2).value());
    }

    @Test
    void bind_nullValue_bindsNull() {
        String sql = "SELECT * FROM t WHERE col = :val";
        Map<String, Object> params = new HashMap<>();
        params.put("val", null);
        Map<String, String> paramTypes = Map.of("val", "TEXT");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE col = ?", result.processedSql());
        assertEquals(1, result.bindings().size());
        assertNull(result.bindings().get(0).value());
        assertEquals(Types.VARCHAR, result.bindings().get(0).jdbcType());
    }

    @Test
    void bind_paramInsideQuotes_notReplaced() {
        String sql = "SELECT * FROM t WHERE col = ':notaparam' AND x = :real";
        Map<String, Object> params = Map.of("notaparam", "SHOULD_NOT_BIND", "real", "yes");
        Map<String, String> paramTypes = Map.of("notaparam", "TEXT", "real", "TEXT");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE col = ':notaparam' AND x = ?", result.processedSql());
        assertEquals(1, result.bindings().size());
        assertEquals("yes", result.bindings().get(0).value());
    }

    @Test
    void bind_doubleColon_notReplaced() {
        String sql = "SELECT col::text FROM t WHERE status = :status";
        Map<String, Object> params = Map.of("status", "Active");
        Map<String, String> paramTypes = Map.of("status", "TEXT");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT col::text FROM t WHERE status = ?", result.processedSql());
        assertEquals(1, result.bindings().size());
        assertEquals("Active", result.bindings().get(0).value());
    }

    @Test
    void bind_numberType_mapsToDouble() {
        String sql = "SELECT * FROM t WHERE amount > :min_amount";
        Map<String, Object> params = Map.of("min_amount", 100.5);
        Map<String, String> paramTypes = Map.of("min_amount", "NUMBER");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE amount > ?", result.processedSql());
        assertEquals(Types.DOUBLE, result.bindings().get(0).jdbcType());
    }

    @Test
    void bind_booleanType_mapsToBoolean() {
        String sql = "SELECT * FROM t WHERE active = :is_active";
        Map<String, Object> params = Map.of("is_active", true);
        Map<String, String> paramTypes = Map.of("is_active", "BOOLEAN");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE active = ?", result.processedSql());
        assertEquals(Types.BOOLEAN, result.bindings().get(0).jdbcType());
    }

    @Test
    void bind_datetimeType_mapsToTimestamp() {
        String sql = "SELECT * FROM t WHERE created_at > :start";
        Map<String, Object> params = Map.of("start", "2024-01-01 10:00:00");
        Map<String, String> paramTypes = Map.of("start", "DATETIME");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE created_at > ?", result.processedSql());
        assertEquals(Types.TIMESTAMP, result.bindings().get(0).jdbcType());
    }

    @Test
    void bind_unknownType_defaultsToVarchar() {
        String sql = "SELECT * FROM t WHERE col = :val";
        Map<String, Object> params = Map.of("val", "test");
        Map<String, String> paramTypes = Map.of("val", "UNKNOWN_TYPE");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals(Types.VARCHAR, result.bindings().get(0).jdbcType());
    }

    @Test
    void bind_missingTypeMapping_defaultsToText() {
        String sql = "SELECT * FROM t WHERE col = :val";
        Map<String, Object> params = Map.of("val", "test");
        Map<String, String> paramTypes = Collections.emptyMap();

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals(Types.VARCHAR, result.bindings().get(0).jdbcType());
    }

    @Test
    void bind_nullSql_returnsNull() {
        BindResult result = binder.bind(null, Map.of(), Map.of());
        assertNull(result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    @Test
    void bind_emptySql_returnsEmpty() {
        BindResult result = binder.bind("", Map.of(), Map.of());
        assertEquals("", result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    @Test
    void bind_nullParams_returnsSqlUnchanged() {
        String sql = "SELECT * FROM t WHERE col = :val";
        BindResult result = binder.bind(sql, null, null);
        assertEquals(sql, result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    @Test
    void bind_paramNotInMap_leftUnchanged() {
        String sql = "SELECT * FROM t WHERE col = :unknown";
        Map<String, Object> params = Map.of("other", "value");
        Map<String, String> paramTypes = Map.of("other", "TEXT");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE col = :unknown", result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    @Test
    void bind_repeatedParam_bindsBothOccurrences() {
        String sql = "SELECT * FROM t WHERE col1 = :status OR col2 = :status";
        Map<String, Object> params = Map.of("status", "Active");
        Map<String, String> paramTypes = Map.of("status", "TEXT");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE col1 = ? OR col2 = ?", result.processedSql());
        assertEquals(2, result.bindings().size());
        assertEquals("Active", result.bindings().get(0).value());
        assertEquals("Active", result.bindings().get(1).value());
    }

    @Test
    void bind_escapedQuoteInString_handledCorrectly() {
        String sql = "SELECT * FROM t WHERE name = 'it''s a name' AND col = :val";
        Map<String, Object> params = Map.of("val", "test");
        Map<String, String> paramTypes = Map.of("val", "TEXT");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE name = 'it''s a name' AND col = ?", result.processedSql());
        assertEquals(1, result.bindings().size());
        assertEquals("test", result.bindings().get(0).value());
    }

    @Test
    void bind_dropdownType_mapsToVarchar() {
        String sql = "SELECT * FROM t WHERE status = :status";
        Map<String, Object> params = Map.of("status", "Active");
        Map<String, String> paramTypes = Map.of("status", "DROPDOWN");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals(Types.VARCHAR, result.bindings().get(0).jdbcType());
    }

    @Test
    void bind_emptyCollection_bindsNullSingle() {
        String sql = "SELECT * FROM t WHERE col IN (:items)";
        Map<String, Object> params = Map.of("items", Collections.emptyList());
        Map<String, String> paramTypes = Map.of("items", "TEXT");

        BindResult result = binder.bind(sql, params, paramTypes);

        assertEquals("SELECT * FROM t WHERE col IN (?)", result.processedSql());
        assertEquals(1, result.bindings().size());
        assertNull(result.bindings().get(0).value());
    }

    @Test
    void mapToJdbcType_caseInsensitive() {
        assertEquals(Types.VARCHAR, binder.mapToJdbcType("text"));
        assertEquals(Types.DOUBLE, binder.mapToJdbcType("number"));
        assertEquals(Types.DATE, binder.mapToJdbcType("date"));
        assertEquals(Types.TIMESTAMP, binder.mapToJdbcType("datetime"));
        assertEquals(Types.BOOLEAN, binder.mapToJdbcType("boolean"));
        assertEquals(Types.VARCHAR, binder.mapToJdbcType("dropdown"));
    }
}
