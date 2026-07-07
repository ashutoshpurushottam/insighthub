package com.insighthub.report;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.datasource.DatasourceEntity;
import com.insighthub.datasource.DatasourceRepository;
import com.insighthub.parameter.ParameterEntity;
import com.insighthub.parameter.ParameterRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportRunService {

    private static final Logger log = LoggerFactory.getLogger(ReportRunService.class);

    private final ReportRepository reportRepository;
    private final DatasourceRepository datasourceRepository;
    private final ParameterRepository parameterRepository;

    /**
     * Execute a report's SQL against its configured datasource and return tabular results.
     */
    @Transactional(readOnly = true)
    public RunReportResult runReport(Long reportId, Map<String, String> params) {
        ReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        if (report.getReportSource() == null || report.getReportSource().isBlank()) {
            throw new IllegalArgumentException("Report has no SQL source defined");
        }

        if (report.getDatasource() == null) {
            throw new IllegalArgumentException("Report has no datasource assigned");
        }

        // Build effective parameters: start with defaults, overlay with provided values
        Map<String, String> effectiveParams = new HashMap<>();
        List<ParameterEntity> paramDefs = parameterRepository.findByReportIdOrderByPositionAsc(reportId);
        for (ParameterEntity paramDef : paramDefs) {
            if (paramDef.getDefaultValue() != null && !paramDef.getDefaultValue().isBlank()) {
                effectiveParams.put(paramDef.getName(), paramDef.getDefaultValue());
            }
        }
        if (params != null) {
            effectiveParams.putAll(params);
        }

        // Substitute :paramName placeholders with values
        String sql = report.getReportSource();
        for (Map.Entry<String, String> entry : effectiveParams.entrySet()) {
            sql = sql.replace(":" + entry.getKey(), "'" + entry.getValue().replace("'", "''") + "'");
        }

        DatasourceEntity ds = report.getDatasource();
        return executeSql(ds, sql);
    }

    /**
     * Execute arbitrary SQL against a given datasource (for preview/testing).
     */
    public RunReportResult executeSql(Long datasourceId, String sql) {
        DatasourceEntity ds = datasourceRepository.findById(datasourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Datasource", "id", datasourceId));
        return executeSql(ds, sql);
    }

    private RunReportResult executeSql(DatasourceEntity ds, String sql) {
        long start = System.currentTimeMillis();

        try {
            if (ds.getDriver() != null && !ds.getDriver().isBlank()) {
                Class.forName(ds.getDriver());
            }

            Properties props = new Properties();
            if (ds.getUsername() != null) props.put("user", ds.getUsername());
            if (ds.getPassword() != null) props.put("password", ds.getPassword());

            try (Connection conn = DriverManager.getConnection(ds.getUrl(), props);
                 Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {

                ResultSetMetaData meta = rs.getMetaData();
                int colCount = meta.getColumnCount();

                List<String> columns = new ArrayList<>();
                for (int i = 1; i <= colCount; i++) {
                    columns.add(meta.getColumnLabel(i));
                }

                List<Map<String, Object>> rows = new ArrayList<>();
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (int i = 1; i <= colCount; i++) {
                        row.put(columns.get(i - 1), rs.getObject(i));
                    }
                    rows.add(row);
                }

                long elapsed = System.currentTimeMillis() - start;
                return RunReportResult.builder()
                    .columns(columns)
                    .rows(rows)
                    .rowCount(rows.size())
                    .executionMs(elapsed)
                    .build();
            }
        } catch (ClassNotFoundException e) {
            throw new IllegalArgumentException("JDBC driver not found: " + ds.getDriver());
        } catch (SQLException e) {
            throw new IllegalArgumentException("SQL execution error: " + e.getMessage());
        }
    }
}
