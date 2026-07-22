package com.insighthub.execution;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class XParameterProcessorTest {

    private XParameterProcessor processor;

    @BeforeEach
    void setUp() {
        processor = new XParameterProcessor();
    }

    // --- Regex parsing tests ---

    @Test
    void process_noXParams_returnsSqlUnchanged() {
        String sql = "SELECT * FROM orders WHERE status = :status";
        Map<String, Object> params = Map.of("status", "ACTIVE");

        XParameterResult result = processor.process(sql, params);

        assertEquals(sql, result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    @Test
    void process_nullSql_returnsNull() {
        XParameterResult result = processor.process(null, Map.of());

        assertNull(result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    @Test
    void process_emptySql_returnsEmpty() {
        XParameterResult result = processor.process("", Map.of());

        assertEquals("", result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    @Test
    void process_nullParams_treatsAsEmpty() {
        String sql = "SELECT * FROM orders";
        XParameterResult result = processor.process(sql, null);

        assertEquals(sql, result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    // --- Comparator validation ---

    @Test
    void process_invalidComparator_throwsException() {
        String sql = "SELECT * FROM t WHERE $x{like,col,param}";
        Map<String, Object> params = Map.of("param", "value");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> processor.process(sql, params));
        assertTrue(ex.getMessage().contains("Invalid x-parameter comparator 'like'"));
    }

    // --- Parameter existence validation (case-sensitive) ---

    @Test
    void process_unknownParameter_throwsException() {
        String sql = "SELECT * FROM t WHERE $x{equal,col,myParam}";
        Map<String, Object> params = Map.of("other", "value");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> processor.process(sql, params));
        assertTrue(ex.getMessage().contains("$x references unknown parameter 'myParam'"));
    }

    @Test
    void process_parameterNameIsCaseSensitive() {
        String sql = "SELECT * FROM t WHERE $x{equal,col,MyParam}";
        // params has "myParam" (lowercase 'm') but SQL references "MyParam" (uppercase 'M')
        Map<String, Object> params = Map.of("myParam", "value");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> processor.process(sql, params));
        assertTrue(ex.getMessage().contains("$x references unknown parameter 'MyParam'"));
    }

    // --- IN comparator ---

    @Test
    void process_inWithMultipleValues() {
        String sql = "SELECT * FROM orders WHERE $x{in,product_name,products}";
        Map<String, Object> params = Map.of("products", List.of("A", "B", "C"));

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM orders WHERE product_name IN (?,?,?)", result.processedSql());
        assertEquals(List.of("A", "B", "C"), result.bindings());
    }

    @Test
    void process_inWithEmptyList() {
        String sql = "SELECT * FROM t WHERE $x{in,col,param}";
        Map<String, Object> params = Map.of("param", List.of());

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE 1=0", result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    @Test
    void process_inWithSingleValue() {
        String sql = "SELECT * FROM t WHERE $x{in,status,statusParam}";
        Map<String, Object> params = Map.of("statusParam", "ACTIVE");

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE status IN (?)", result.processedSql());
        assertEquals(List.of("ACTIVE"), result.bindings());
    }

    // --- NOT IN comparator ---

    @Test
    void process_notinWithMultipleValues() {
        String sql = "SELECT * FROM t WHERE $x{notin,region,excludedRegions}";
        Map<String, Object> params = Map.of("excludedRegions", List.of("WEST", "SOUTH"));

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE region NOT IN (?,?)", result.processedSql());
        assertEquals(List.of("WEST", "SOUTH"), result.bindings());
    }

    @Test
    void process_notinWithEmptyList() {
        String sql = "SELECT * FROM t WHERE $x{notin,col,param}";
        Map<String, Object> params = Map.of("param", List.of());

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE 1=1", result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    // --- EQUAL comparator ---

    @Test
    void process_equalWithValue() {
        String sql = "SELECT * FROM t WHERE $x{equal,region,region_param}";
        Map<String, Object> params = Map.of("region_param", "NORTH");

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE region = ?", result.processedSql());
        assertEquals(List.of("NORTH"), result.bindings());
    }

    @Test
    void process_equalWithNull() {
        String sql = "SELECT * FROM t WHERE $x{equal,region,region_param}";
        Map<String, Object> params = new HashMap<>();
        params.put("region_param", null);

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE region IS NULL", result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    // --- NOT EQUAL comparator ---

    @Test
    void process_notequalWithValue() {
        String sql = "SELECT * FROM t WHERE $x{notequal,status,statusParam}";
        Map<String, Object> params = Map.of("statusParam", "CLOSED");

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE status <> ?", result.processedSql());
        assertEquals(List.of("CLOSED"), result.bindings());
    }

    @Test
    void process_notequalWithNull() {
        String sql = "SELECT * FROM t WHERE $x{notequal,status,statusParam}";
        Map<String, Object> params = new HashMap<>();
        params.put("statusParam", null);

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE status IS NOT NULL", result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }

    // --- Multiple $x blocks in same SQL ---

    @Test
    void process_multipleXParamsInSameSql() {
        String sql = "SELECT * FROM orders WHERE $x{in,product_name,products} AND $x{equal,region,region_param}";
        Map<String, Object> params = new HashMap<>();
        params.put("products", List.of("A", "B", "C"));
        params.put("region_param", "NORTH");

        XParameterResult result = processor.process(sql, params);

        assertEquals(
                "SELECT * FROM orders WHERE product_name IN (?,?,?) AND region = ?",
                result.processedSql());
        assertEquals(List.of("A", "B", "C", "NORTH"), result.bindings());
    }

    // --- Whitespace tolerance in $x{} syntax ---

    @Test
    void process_whitespaceInXParamSyntax() {
        String sql = "SELECT * FROM t WHERE $x{ in , col , param }";
        Map<String, Object> params = Map.of("param", List.of("X"));

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE col IN (?)", result.processedSql());
        assertEquals(List.of("X"), result.bindings());
    }

    // --- IN with null value (treated as empty) ---

    @Test
    void process_inWithNullValue_treatedAsEmpty() {
        String sql = "SELECT * FROM t WHERE $x{in,col,param}";
        Map<String, Object> params = new HashMap<>();
        params.put("param", null);

        XParameterResult result = processor.process(sql, params);

        assertEquals("SELECT * FROM t WHERE 1=0", result.processedSql());
        assertTrue(result.bindings().isEmpty());
    }
}
