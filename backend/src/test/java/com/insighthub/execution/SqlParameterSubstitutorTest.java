package com.insighthub.execution;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class SqlParameterSubstitutorTest {

    private SqlParameterSubstitutor substitutor;

    @BeforeEach
    void setUp() {
        substitutor = new SqlParameterSubstitutor();
    }

    // --- Single value substitution ---

    @Test
    void substitute_singleValue_quotesAndEscapes() {
        String sql = "SELECT * FROM users WHERE status = :status";
        Map<String, Object> params = Map.of("status", "Active");

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM users WHERE status = 'Active'", result);
    }

    @Test
    void substitute_singleValueWithSingleQuote_escapesQuote() {
        String sql = "SELECT * FROM users WHERE name = :name";
        Map<String, Object> params = Map.of("name", "O'Brien");

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM users WHERE name = 'O''Brien'", result);
    }

    @Test
    void substitute_valueWithMultipleSingleQuotes_escapesAll() {
        String sql = "SELECT * FROM t WHERE col = :val";
        Map<String, Object> params = Map.of("val", "it's a 'test'");

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE col = 'it''s a ''test'''", result);
    }

    // --- Multi-value substitution ---

    @Test
    void substitute_multipleValues_expandsToCommaSeparatedList() {
        String sql = "SELECT * FROM orders WHERE status IN (:status)";
        Map<String, Object> params = Map.of("status", List.of("Active", "Closed", "Pending"));

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM orders WHERE status IN ('Active','Closed','Pending')", result);
    }

    @Test
    void substitute_singleValueInList_expandsToSingleQuotedValue() {
        String sql = "SELECT * FROM orders WHERE status IN (:status)";
        Map<String, Object> params = Map.of("status", List.of("Active"));

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM orders WHERE status IN ('Active')", result);
    }

    @Test
    void substitute_multiValueWithQuotes_escapesAllValues() {
        String sql = "SELECT * FROM t WHERE name IN (:names)";
        Map<String, Object> params = Map.of("names", List.of("O'Brien", "D'Arcy"));

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE name IN ('O''Brien','D''Arcy')", result);
    }

    @Test
    void substitute_emptyList_returnsNull() {
        String sql = "SELECT * FROM t WHERE col IN (:vals)";
        Map<String, Object> params = Map.of("vals", List.of());

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE col IN (NULL)", result);
    }

    // --- NULL handling ---

    @Test
    void substitute_nullValue_substitutesNULL() {
        String sql = "SELECT * FROM t WHERE col = :param";
        Map<String, Object> params = new HashMap<>();
        params.put("param", null);

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE col = NULL", result);
    }

    // --- Multiple parameters ---

    @Test
    void substitute_multipleParams_replacesAll() {
        String sql = "SELECT * FROM t WHERE a = :first AND b = :second";
        Map<String, Object> params = Map.of("first", "hello", "second", "world");

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE a = 'hello' AND b = 'world'", result);
    }

    @Test
    void substitute_sameParamMultipleTimes_replacesAll() {
        String sql = "SELECT * FROM t WHERE a = :val OR b = :val";
        Map<String, Object> params = Map.of("val", "test");

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE a = 'test' OR b = 'test'", result);
    }

    // --- Edge cases ---

    @Test
    void substitute_paramNotInMap_leavesUnchanged() {
        String sql = "SELECT * FROM t WHERE col = :unknown";
        Map<String, Object> params = Map.of("other", "value");

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE col = :unknown", result);
    }

    @Test
    void substitute_nullSql_returnsNull() {
        String result = substitutor.substitute(null, Map.of("a", "b"));

        assertNull(result);
    }

    @Test
    void substitute_emptySql_returnsEmpty() {
        String result = substitutor.substitute("", Map.of("a", "b"));

        assertEquals("", result);
    }

    @Test
    void substitute_nullParams_returnsSqlUnchanged() {
        String sql = "SELECT * FROM t WHERE col = :param";

        String result = substitutor.substitute(sql, null);

        assertEquals(sql, result);
    }

    @Test
    void substitute_emptyParams_returnsSqlUnchanged() {
        String sql = "SELECT * FROM t WHERE col = :param";

        String result = substitutor.substitute(sql, Map.of());

        assertEquals(sql, result);
    }

    @Test
    void substitute_paramWithUnderscore_works() {
        String sql = "SELECT * FROM t WHERE start_date = :start_date";
        Map<String, Object> params = Map.of("start_date", "2024-01-01");

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE start_date = '2024-01-01'", result);
    }

    @Test
    void substitute_emptyStringValue_producesEmptyQuotedString() {
        String sql = "SELECT * FROM t WHERE col = :param";
        Map<String, Object> params = Map.of("param", "");

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE col = ''", result);
    }

    @Test
    void substitute_numericValue_quotesAsString() {
        String sql = "SELECT * FROM t WHERE id = :id";
        Map<String, Object> params = Map.of("id", "42");

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE id = '42'", result);
    }

    @Test
    void substitute_multiValueWithNullElement_handlesGracefully() {
        String sql = "SELECT * FROM t WHERE col IN (:vals)";
        List<String> values = new ArrayList<>();
        values.add("a");
        values.add(null);
        values.add("b");
        Map<String, Object> params = Map.of("vals", values);

        String result = substitutor.substitute(sql, params);

        assertEquals("SELECT * FROM t WHERE col IN ('a',NULL,'b')", result);
    }
}
