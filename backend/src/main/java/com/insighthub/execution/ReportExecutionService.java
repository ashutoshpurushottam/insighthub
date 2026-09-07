package com.insighthub.execution;

import com.insighthub.accessright.AccessRightService;
import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.datasource.DatasourceEntity;
import com.insighthub.drilldown.DrillDownLinkEntity;
import com.insighthub.drilldown.DrillDownRepository;
import com.insighthub.fixedvalue.FixedParameterValueService;
import com.insighthub.guardrails.GuardrailsConfigEntity;
import com.insighthub.guardrails.GuardrailsService;
import com.insighthub.parameter.ExpressionResolver;
import com.insighthub.parameter.ParameterEntity;
import com.insighthub.parameter.ParameterRepository;
import com.insighthub.parameter.ParameterValidator;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.ReportRepository;
import com.insighthub.rule.RuleResolver;
import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
import com.insighthub.usergroup.UserGroupEntity;
import com.insighthub.usergroup.UserGroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Types;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Main 9-step orchestrator for report execution.
 *
 * <p>Execution pipeline:</p>
 * <ol>
 *   <li>RBAC Check — verify user has access to the report</li>
 *   <li>Parameter Resolution — resolve expressions, apply defaults</li>
 *   <li>Parameter Validation — validate required, type, null state</li>
 *   <li>Guardrails Check — concurrency limit, date range validation</li>
 *   <li>X-Parameter Processing — replace {@code $x{...}} blocks with SQL fragments (if prepared statements enabled)</li>
 *   <li>SQL Construction — prepared statement binding OR string substitution</li>
 *   <li>Streaming Execution — cursor-based query via StreamingResultSetHandler</li>
 *   <li>Result Assembly — build PaginatedResult DTO with drill-down info</li>
 *   <li>Resource Cleanup — release concurrency counter in finally block</li>
 * </ol>
 *
 * <p>Key properties enforced:</p>
 * <ul>
 *   <li>Property 4: All :paramName substitutions escape single quotes (' → '') (fallback path)</li>
 *   <li>Property 5: Prepared statement binding for SQL injection prevention (preferred path)</li>
 *   <li>Property 6: Concurrency counter release in finally block</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportExecutionService {

    private final ReportRepository reportRepository;
    private final ParameterRepository parameterRepository;
    private final UserRepository userRepository;
    private final UserGroupRepository userGroupRepository;
    private final AccessRightService accessRightService;
    private final ExpressionResolver expressionResolver;
    private final ParameterValidator parameterValidator;
    private final ExecutionGuard executionGuard;
    private final ConcurrencyLimiter concurrencyLimiter;
    private final GuardrailsService guardrailsService;
    private final StreamingResultSetHandler streamingResultSetHandler;
    private final DrillDownRepository drillDownRepository;
    private final XParameterProcessor xParameterProcessor;
    private final SqlParameterBinder sqlParameterBinder;
    private final FixedParameterValueService fixedParameterValueService;
    private final RuleResolver ruleResolver;

    /**
     * Executes a report through the full 7-step pipeline.
     *
     * @param reportId the ID of the report to execute
     * @param request  the execution request containing params, page, pageSize, sort
     * @param username the authenticated username of the requesting user
     * @return PaginatedResult containing columns, rows, pagination metadata, and drill-down links
     */
    @Transactional(readOnly = true)
    public PaginatedResult execute(Long reportId, ExecuteReportRequest request, String username) {
        // Load report
        ReportEntity report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        // Check if report is inactive (Requirement 13.5)
        if (!report.isActive()) {
            throw new IllegalArgumentException("Report is disabled");
        }

        // Resolve user for RBAC
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        // ===== Step 1: RBAC Check (Requirements 12.1, 12.2, 12.3, 12.4) =====
        checkAccess(user, report);

        // ===== Step 1.5: Fixed Value Resolution (Requirement 6) =====
        // Resolve fixed parameter values for this user — these override user-supplied values.
        // Fixed values are already resolved through ExpressionResolver by the service.
        Map<String, Object> fixedValues = fixedParameterValueService.resolveFixedValuesForExecution(reportId, user.getId());

        // Merge fixed values into user-supplied params (fixed values override user input)
        Map<String, Object> mergedParams = new HashMap<>();
        if (request.getParams() != null) {
            mergedParams.putAll(request.getParams());
        }
        mergedParams.putAll(fixedValues);

        // Load guardrails for concurrency check
        GuardrailsConfigEntity guardrails = guardrailsService.getEffectiveGuardrails(reportId);

        // ===== Step 3 (partial): Concurrency check (Requirement 19.3) =====
        // Acquire concurrency slot BEFORE parameter work so counter is held during execution
        boolean acquired = concurrencyLimiter.tryAcquire(user.getId(), guardrails.getMaxConcurrentPerUser());
        if (!acquired) {
            throw new ConcurrencyLimitExceededException(
                    "Too many concurrent executions. Maximum " + guardrails.getMaxConcurrentPerUser() + " allowed.");
        }

        try {
            // ===== Step 2: Parameter Resolution (Requirements 13.1, 13.4, 14.1-14.6) =====
            List<ParameterEntity> parameterDefs = parameterRepository.findByReportIdOrderByPositionAsc(reportId);
            Map<String, Object> resolvedParams = resolveParameters(parameterDefs, mergedParams);

            // ===== Step 2.5: Null Parameter Handling (Requirement 3) =====
            // For each parameter listed in nullParams, override its resolved value with null.
            // This ensures the prepared statement path uses setNull() and the fallback path
            // substitutes the literal SQL keyword NULL.
            List<String> nullParams = request.getNullParams();
            if (nullParams != null && !nullParams.isEmpty()) {
                for (String nullParamName : nullParams) {
                    resolvedParams.put(nullParamName, null);
                }
            }

            // Validate parameters
            parameterValidator.validate(parameterDefs, resolvedParams);

            // ===== Step 3: Guardrails Check — date range (Requirements 20.1, 20.2, 20.3) =====
            executionGuard.validate(reportId, resolvedParams);

            // ===== Step 3.5: Rule Resolution (Requirement 4) =====
            // If the report uses rules, resolve the user's rule-based WHERE clauses
            // and replace the #rules# placeholder in the SQL source.
            // Throws IllegalStateException if user has no values for a required rule.
            String reportSql = report.getReportSource();
            if (report.isUsesRules()) {
                String rulesClause = ruleResolver.resolve(reportId, user.getId());
                reportSql = reportSql.replace("#rules#", rulesClause);
            }

            // ===== Step 4–5: SQL Construction + Execution =====
            // Branch based on report.usePreparedStatements flag (Requirement 5.5, 5.6)
            long startTime = System.currentTimeMillis();
            DataSource dataSource = createDataSource(report.getDatasource());
            StreamingResultSetHandler.StreamingResult streamingResult;

            if (report.isUsePreparedStatements()) {
                // === Prepared Statement Path (Requirement 5) ===
                String sql = reportSql;
                if (sql == null || sql.isBlank()) {
                    throw new IllegalArgumentException("Report SQL source is empty");
                }

                // Step 5a: X-Parameter Processing — replace $x{...} blocks with SQL fragments
                XParameterResult xResult = xParameterProcessor.process(sql, resolvedParams);
                String processedSql = xResult.processedSql();
                List<Object> xBindings = xResult.bindings();

                // Remove x-parameter-consumed params from the map passed to SqlParameterBinder
                // (x-params are already processed and bound)
                Map<String, Object> remainingParams = new HashMap<>(resolvedParams);

                // Step 5b: Build paramTypes map from parameter definitions (paramName → paramType)
                Map<String, String> paramTypes = parameterDefs.stream()
                        .collect(Collectors.toMap(
                                ParameterEntity::getName,
                                ParameterEntity::getParamType,
                                (existing, replacement) -> existing
                        ));

                // Step 5c: SqlParameterBinder — replace :paramName → ? and collect bindings
                BindResult bindResult = sqlParameterBinder.bind(processedSql, remainingParams, paramTypes);
                String finalSql = bindResult.processedSql();

                // Append ORDER BY if sort is requested
                finalSql = appendOrderBy(finalSql, request.getSortColumn(), request.getSortDirection());

                // Step 5d: Combine x-param bindings with binder bindings
                // X-param bindings come first since they're processed first in the SQL
                List<BindValue> allBindings = new ArrayList<>();
                for (Object xVal : xBindings) {
                    allBindings.add(new BindValue(xVal, Types.VARCHAR));
                }
                allBindings.addAll(bindResult.bindings());

                // Step 5e: Execute with PreparedStatement
                streamingResult = streamingResultSetHandler.execute(
                        dataSource, finalSql, allBindings, guardrails,
                        request.getPage(), request.getPageSize());
            } else {
                // === String Substitution Fallback Path (Requirement 5.5) ===
                String sql = constructSql(reportSql, parameterDefs, resolvedParams,
                        request.getSortColumn(), request.getSortDirection());

                // Execute with plain Statement (no bindings)
                streamingResult = streamingResultSetHandler.execute(
                        dataSource, sql, guardrails,
                        request.getPage(), request.getPageSize());
            }

            long executionMs = System.currentTimeMillis() - startTime;

            // ===== Step 6: Result Assembly (Requirements 22.3, 23.4, 26.2, 26.3) =====
            return assembleResult(streamingResult, request.getPage(), request.getPageSize(),
                    executionMs, reportId);

        } finally {
            // ===== Step 7: Resource Cleanup (Property 6: Concurrency Counter Balance) =====
            concurrencyLimiter.release(user.getId());
        }
    }

    /**
     * Step 1: RBAC check — verifies user has access to the report via the four-level
     * access rights model (user-report, user-report-group, user-group-report, user-group-report-group).
     *
     * Admin users (accessLevel >= 10) bypass this check entirely.
     * The report creator also bypasses this check.
     */
    private void checkAccess(UserEntity user, ReportEntity report) {
        // Admin users can access all reports
        if (user.getAccessLevel() >= 10) {
            return;
        }

        Long userId = user.getId();
        Long reportId = report.getId();
        Long reportGroupId = report.getReportGroup() != null ? report.getReportGroup().getId() : null;

        // Check 1: Direct user-to-report access
        List<Long> userReportIds = accessRightService.getUserReportIds(userId);
        if (userReportIds.contains(reportId)) {
            return;
        }

        // Check 2: User-to-report-group access
        if (reportGroupId != null) {
            List<Long> userGroupIds = accessRightService.getUserReportGroupIds(userId);
            if (userGroupIds.contains(reportGroupId)) {
                return;
            }
        }

        // Check 3 & 4: User group-based access
        List<UserGroupEntity> userGroups = userGroupRepository.findAll().stream()
                .filter(group -> group.getMembers().stream()
                        .anyMatch(member -> member.getId().equals(userId)))
                .toList();

        for (UserGroupEntity group : userGroups) {
            // Check 3: User-group-to-report
            List<Long> groupReportIds = accessRightService.getUserGroupReportIds(group.getId());
            if (groupReportIds.contains(reportId)) {
                return;
            }

            // Check 4: User-group-to-report-group
            if (reportGroupId != null) {
                List<Long> groupReportGroupIds = accessRightService.getUserGroupReportGroupIds(group.getId());
                if (groupReportGroupIds.contains(reportGroupId)) {
                    return;
                }
            }
        }

        // No access found at any level
        throw new AccessDeniedException("Access denied to report");
    }

    /**
     * Step 2: Resolves parameter values by applying expression defaults for missing parameters.
     * User-supplied values take priority; expressions fill in missing defaults.
     */
    private Map<String, Object> resolveParameters(List<ParameterEntity> parameterDefs,
                                                   Map<String, Object> suppliedParams) {
        Map<String, Object> resolved = new HashMap<>();
        if (suppliedParams != null) {
            resolved.putAll(suppliedParams);
        }

        for (ParameterEntity param : parameterDefs) {
            String paramName = param.getName();

            // If user didn't supply a value and there's a default, resolve it
            if (!resolved.containsKey(paramName) || isBlankValue(resolved.get(paramName))) {
                String defaultValue = param.getDefaultValue();
                if (defaultValue != null && !defaultValue.isBlank()) {
                    String resolvedDefault = expressionResolver.resolve(defaultValue);
                    resolved.put(paramName, resolvedDefault);
                }
            }
        }

        return resolved;
    }

    /**
     * Step 4: Constructs the final SQL by substituting :paramName placeholders with
     * escaped values, and appending ORDER BY and wrapping for pagination context.
     *
     * <p>Property 4: All :paramName substitutions escape single quotes (' → '')</p>
     */
    private String constructSql(String reportSource, List<ParameterEntity> parameterDefs,
                                Map<String, Object> resolvedParams,
                                String sortColumn, String sortDirection) {
        if (reportSource == null || reportSource.isBlank()) {
            throw new IllegalArgumentException("Report SQL source is empty");
        }

        String sql = reportSource;

        // Build a lookup for multi-value parameters
        Set<String> multiValueParams = parameterDefs.stream()
                .filter(ParameterEntity::isMultiValue)
                .map(ParameterEntity::getName)
                .collect(Collectors.toSet());

        // Substitute all :paramName placeholders with escaped values
        for (Map.Entry<String, Object> entry : resolvedParams.entrySet()) {
            String paramName = entry.getKey();
            Object value = entry.getValue();
            String placeholder = ":" + paramName;

            if (!sql.contains(placeholder)) {
                continue;
            }

            String substitution;
            if (value == null) {
                // Null value: substitute literal SQL NULL keyword (Requirement 3.5)
                substitution = "NULL";
            } else if (multiValueParams.contains(paramName) && value instanceof List<?> values) {
                // Multi-value expansion: 'val1','val2','val3'
                substitution = values.stream()
                        .map(v -> "'" + escapeSingleQuotes(v.toString()) + "'")
                        .collect(Collectors.joining(","));
                if (substitution.isEmpty()) {
                    substitution = "''";
                }
            } else {
                // Single value substitution with quote escaping
                substitution = "'" + escapeSingleQuotes(value.toString()) + "'";
            }

            sql = sql.replace(placeholder, substitution);
        }

        // Append ORDER BY if sort is requested (Requirement 24.1, 24.2)
        if (sortColumn != null && !sortColumn.isBlank()) {
            String direction = "ASC";
            if (sortDirection != null && sortDirection.equalsIgnoreCase("DESC")) {
                direction = "DESC";
            }
            // Validate sort column to prevent SQL injection (only allow alphanumeric and underscore)
            String safeSortColumn = sortColumn.replaceAll("[^a-zA-Z0-9_]", "");
            if (!safeSortColumn.isEmpty()) {
                sql = sql + " ORDER BY " + safeSortColumn + " " + direction;
            }
        }

        return sql;
    }

    /**
     * Escapes single quotes in parameter values for safe SQL substitution.
     * Property 4: ' → ''
     */
    private String escapeSingleQuotes(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("'", "''");
    }

    /**
     * Appends an ORDER BY clause to the SQL if sort is requested.
     * Validates the sort column to prevent SQL injection (only allows alphanumeric and underscore).
     *
     * @param sql           the SQL query to append ORDER BY to
     * @param sortColumn    the column to sort by (may be null)
     * @param sortDirection ASC or DESC (may be null, defaults to ASC)
     * @return the SQL with ORDER BY appended if applicable
     */
    private String appendOrderBy(String sql, String sortColumn, String sortDirection) {
        if (sortColumn != null && !sortColumn.isBlank()) {
            String direction = "ASC";
            if (sortDirection != null && sortDirection.equalsIgnoreCase("DESC")) {
                direction = "DESC";
            }
            // Validate sort column to prevent SQL injection (only allow alphanumeric and underscore)
            String safeSortColumn = sortColumn.replaceAll("[^a-zA-Z0-9_]", "");
            if (!safeSortColumn.isEmpty()) {
                sql = sql + " ORDER BY " + safeSortColumn + " " + direction;
            }
        }
        return sql;
    }

    /**
     * Step 6: Assembles the final PaginatedResult from the streaming execution result,
     * including pagination metadata and drill-down link information.
     */
    private PaginatedResult assembleResult(StreamingResultSetHandler.StreamingResult streamingResult,
                                           int page, int pageSize, long executionMs, Long reportId) {
        long totalRows = streamingResult.totalRowsScanned();
        int totalPages = (int) Math.ceil((double) totalRows / pageSize);
        if (totalPages == 0) {
            totalPages = 1;
        }

        PaginationMeta pagination = PaginationMeta.builder()
                .page(page)
                .pageSize(pageSize)
                .totalRows(totalRows)
                .totalPages(totalPages)
                .build();

        // Load drill-down links for this report
        List<DrillDownInfo> drillDownLinks = loadDrillDownInfo(reportId);

        return PaginatedResult.builder()
                .columns(streamingResult.columns())
                .rows(streamingResult.rows())
                .pagination(pagination)
                .executionMs(executionMs)
                .truncated(streamingResult.truncated())
                .truncationReason(streamingResult.truncationReason())
                .drillDownLinks(drillDownLinks)
                .build();
    }

    /**
     * Loads drill-down link information (including param mappings) for the response.
     */
    private List<DrillDownInfo> loadDrillDownInfo(Long reportId) {
        List<DrillDownLinkEntity> links = drillDownRepository.findByParentReportIdWithMappings(reportId);
        return links.stream()
                .map(link -> DrillDownInfo.builder()
                        .column(link.getTriggerColumn())
                        .childReportId(link.getChildReport().getId())
                        .childReportName(link.getChildReport().getName())
                        .paramMappings(link.getParamMappings().stream()
                                .map(m -> DrillDownInfo.ParamMapping.builder()
                                        .parentColumnName(m.getParentColumnName())
                                        .childParamName(m.getChildParamName())
                                        .build())
                                .toList())
                        .build())
                .toList();
    }

    /**
     * Creates a JDBC DataSource from the report's configured datasource entity.
     */
    private DataSource createDataSource(DatasourceEntity datasourceEntity) {
        if (datasourceEntity == null) {
            throw new IllegalArgumentException("Report has no datasource configured");
        }

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setUrl(datasourceEntity.getUrl());
        dataSource.setUsername(datasourceEntity.getUsername());
        dataSource.setPassword(datasourceEntity.getPassword());

        if (datasourceEntity.getDriver() != null && !datasourceEntity.getDriver().isBlank()) {
            dataSource.setDriverClassName(datasourceEntity.getDriver());
        }

        return dataSource;
    }

    /**
     * Checks if a parameter value is blank.
     */
    private boolean isBlankValue(Object value) {
        if (value == null) {
            return true;
        }
        if (value instanceof String s) {
            return s.isBlank();
        }
        if (value instanceof List<?> list) {
            return list.isEmpty();
        }
        return false;
    }

    /**
     * Exception indicating the per-user concurrency limit has been reached.
     * Mapped to HTTP 429 by the controller/exception handler.
     */
    public static class ConcurrencyLimitExceededException extends RuntimeException {
        public ConcurrencyLimitExceededException(String message) {
            super(message);
        }
    }
}
