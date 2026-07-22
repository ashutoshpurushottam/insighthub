package com.insighthub.export;

import com.insighthub.accessright.AccessRightService;
import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.datasource.DatasourceEntity;
import com.insighthub.execution.*;
import com.insighthub.guardrails.GuardrailsConfigEntity;
import com.insighthub.guardrails.GuardrailsService;
import com.insighthub.parameter.ExpressionResolver;
import com.insighthub.parameter.ParameterEntity;
import com.insighthub.parameter.ParameterRepository;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.ReportRepository;
import com.insighthub.rule.RuleResolver;
import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
import com.insighthub.usergroup.UserGroupEntity;
import com.insighthub.usergroup.UserGroupRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Types;
import java.util.*;
import java.util.stream.Collectors;

/**
 * REST controller for streaming report exports in CSV, XLSX, and PDF formats.
 *
 * <p>Each endpoint performs the following steps:</p>
 * <ol>
 *   <li>Load the report by ID</li>
 *   <li>Verify RBAC access (same four-level model as report execution)</li>
 *   <li>Get effective guardrails for the report</li>
 *   <li>Resolve parameter defaults and substitute into SQL</li>
 *   <li>Create DataSource from report's datasource entity</li>
 *   <li>Set Content-Type and Content-Disposition headers</li>
 *   <li>Delegate to the appropriate export service with response.getOutputStream()</li>
 * </ol>
 *
 * <p>Requirements: 28.4, 29.4, 30.4, 12.1</p>
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
public class ExportController {

    private final ReportRepository reportRepository;
    private final ParameterRepository parameterRepository;
    private final UserRepository userRepository;
    private final UserGroupRepository userGroupRepository;
    private final AccessRightService accessRightService;
    private final GuardrailsService guardrailsService;
    private final ExpressionResolver expressionResolver;
    private final SqlParameterSubstitutor sqlParameterSubstitutor;
    private final XParameterProcessor xParameterProcessor;
    private final SqlParameterBinder sqlParameterBinder;
    private final CsvExportService csvExportService;
    private final ExcelExportService excelExportService;
    private final PdfExportService pdfExportService;
    private final RuleResolver ruleResolver;

    /**
     * POST /api/reports/{id}/export/csv — Stream CSV export.
     * Content-Type: text/csv
     */
    @PostMapping("/{id}/export/csv")
    @Transactional(readOnly = true)
    public void exportCsv(
            @PathVariable Long id,
            @RequestBody(required = false) ExportRequest request,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletResponse response) throws IOException {

        AuthorizedContext ctx = loadAndAuthorize(id, currentUser.getUsername());
        ReportEntity report = ctx.report();
        Long userId = ctx.user().getId();
        GuardrailsConfigEntity guardrails = guardrailsService.getEffectiveGuardrails(id);
        DataSource dataSource = createDataSource(report.getDatasource());

        String filename = sanitizeFilename(report.getName()) + ".csv";
        response.setContentType("text/csv");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"" + filename + "\"; filename*=UTF-8''"
                        + URLEncoder.encode(filename, StandardCharsets.UTF_8));

        log.info("Starting CSV export for report '{}' (id={})", report.getName(), id);

        if (report.isUsePreparedStatements()) {
            // Prepared statement path (Requirement 5.4)
            ExportBindResult bindResult = buildPreparedExportSql(report, request, userId);
            csvExportService.export(dataSource, bindResult.sql(), bindResult.bindings(),
                    guardrails, response.getOutputStream(), report.getName());
        } else {
            // String substitution fallback
            String sql = buildExportSql(report, request, userId);
            csvExportService.export(dataSource, sql, guardrails, response.getOutputStream(), report.getName());
        }
    }

    /**
     * POST /api/reports/{id}/export/xlsx — Stream XLSX export.
     * Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     */
    @PostMapping("/{id}/export/xlsx")
    @Transactional(readOnly = true)
    public void exportXlsx(
            @PathVariable Long id,
            @RequestBody(required = false) ExportRequest request,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletResponse response) throws IOException {

        AuthorizedContext ctx = loadAndAuthorize(id, currentUser.getUsername());
        ReportEntity report = ctx.report();
        Long userId = ctx.user().getId();
        GuardrailsConfigEntity guardrails = guardrailsService.getEffectiveGuardrails(id);
        DataSource dataSource = createDataSource(report.getDatasource());

        String filename = sanitizeFilename(report.getName()) + ".xlsx";
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"" + filename + "\"; filename*=UTF-8''"
                        + URLEncoder.encode(filename, StandardCharsets.UTF_8));

        log.info("Starting XLSX export for report '{}' (id={})", report.getName(), id);

        if (report.isUsePreparedStatements()) {
            // Prepared statement path (Requirement 5.4)
            ExportBindResult bindResult = buildPreparedExportSql(report, request, userId);
            excelExportService.export(dataSource, bindResult.sql(), bindResult.bindings(),
                    guardrails, response.getOutputStream());
        } else {
            // String substitution fallback
            String sql = buildExportSql(report, request, userId);
            excelExportService.export(dataSource, sql, guardrails, response.getOutputStream());
        }
    }

    /**
     * POST /api/reports/{id}/export/pdf — Stream PDF export.
     * Content-Type: application/pdf
     */
    @PostMapping("/{id}/export/pdf")
    @Transactional(readOnly = true)
    public void exportPdf(
            @PathVariable Long id,
            @RequestBody(required = false) ExportRequest request,
            @AuthenticationPrincipal UserDetails currentUser,
            HttpServletResponse response) throws IOException {

        AuthorizedContext ctx = loadAndAuthorize(id, currentUser.getUsername());
        ReportEntity report = ctx.report();
        Long userId = ctx.user().getId();
        GuardrailsConfigEntity guardrails = guardrailsService.getEffectiveGuardrails(id);
        DataSource dataSource = createDataSource(report.getDatasource());

        String filename = sanitizeFilename(report.getName()) + ".pdf";
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"" + filename + "\"; filename*=UTF-8''"
                        + URLEncoder.encode(filename, StandardCharsets.UTF_8));

        log.info("Starting PDF export for report '{}' (id={})", report.getName(), id);

        if (report.isUsePreparedStatements()) {
            // Prepared statement path (Requirement 5.4)
            ExportBindResult bindResult = buildPreparedExportSql(report, request, userId);
            pdfExportService.export(dataSource, bindResult.sql(), bindResult.bindings(),
                    report.getName(), guardrails, response.getOutputStream());
        } else {
            // String substitution fallback
            String sql = buildExportSql(report, request, userId);
            pdfExportService.export(dataSource, sql, report.getName(), guardrails, response.getOutputStream());
        }
    }

    // ===== Private helpers =====

    /**
     * Loads the report by ID and verifies RBAC access for the authenticated user.
     * Reuses the same four-level access model as ReportExecutionService.
     *
     * @param reportId the report ID
     * @param username the authenticated username
     * @return the authorized context containing the report and user entities
     * @throws ResourceNotFoundException if report not found
     * @throws AccessDeniedException if user lacks access
     */
    private AuthorizedContext loadAndAuthorize(Long reportId, String username) {
        ReportEntity report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        checkAccess(user, report);
        return new AuthorizedContext(report, user);
    }

    /**
     * Holds the report and user pair after successful authorization.
     */
    private record AuthorizedContext(ReportEntity report, UserEntity user) {
    }

    /**
     * Verifies RBAC access using the four-level access rights model:
     * user-report, user-report-group, user-group-report, user-group-report-group.
     * Admin users (accessLevel >= 10) bypass this check.
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

        throw new AccessDeniedException("Access denied to report");
    }

    /**
     * Builds the fully-substituted SQL for export by resolving parameter defaults
     * and substituting all :paramName placeholders using string substitution (fallback path).
     * If the report uses rules, the #rules# placeholder is replaced with the user's
     * effective rule-based WHERE clauses before parameter substitution.
     */
    private String buildExportSql(ReportEntity report, ExportRequest request, Long userId) {
        String sql = report.getReportSource();
        if (sql == null || sql.isBlank()) {
            throw new IllegalArgumentException("Report has no SQL source configured");
        }

        // Apply rule-based filtering before parameter substitution
        if (report.isUsesRules()) {
            String rulesClause = ruleResolver.resolve(report.getId(), userId);
            sql = sql.replace("#rules#", rulesClause);
        }

        // Merge supplied params with resolved defaults
        Map<String, Object> params = new HashMap<>();
        List<ParameterEntity> parameterDefs = parameterRepository.findByReportIdOrderByPositionAsc(report.getId());

        // Apply user-supplied params
        if (request != null && request.getParams() != null) {
            params.putAll(request.getParams());
        }

        // Fill in defaults for missing parameters using expression resolution
        for (ParameterEntity paramDef : parameterDefs) {
            String paramName = paramDef.getName();
            if (!params.containsKey(paramName) || isBlankValue(params.get(paramName))) {
                String defaultValue = paramDef.getDefaultValue();
                if (defaultValue != null && !defaultValue.isBlank()) {
                    params.put(paramName, expressionResolver.resolve(defaultValue));
                }
            }
        }

        // Substitute parameters into SQL using SqlParameterSubstitutor (Property 4)
        return sqlParameterSubstitutor.substitute(sql, params);
    }

    /**
     * Builds export SQL using the prepared statement path: processes $x{...} blocks
     * via XParameterProcessor, then converts :paramName placeholders to positional ? parameters
     * via SqlParameterBinder.
     * If the report uses rules, the #rules# placeholder is replaced with the user's
     * effective rule-based WHERE clauses before parameter processing.
     *
     * <p>This method implements the same branching logic as ReportExecutionService
     * for the prepared statement execution path (Requirement 5.4).</p>
     *
     * @param report  the report entity
     * @param request the export request containing user-supplied parameters
     * @param userId  the current user's ID for rule resolution
     * @return an ExportBindResult containing the processed SQL and ordered bindings
     */
    private ExportBindResult buildPreparedExportSql(ReportEntity report, ExportRequest request, Long userId) {
        String sql = report.getReportSource();
        if (sql == null || sql.isBlank()) {
            throw new IllegalArgumentException("Report has no SQL source configured");
        }

        // Apply rule-based filtering before parameter processing
        if (report.isUsesRules()) {
            String rulesClause = ruleResolver.resolve(report.getId(), userId);
            sql = sql.replace("#rules#", rulesClause);
        }

        // Merge supplied params with resolved defaults
        Map<String, Object> params = new HashMap<>();
        List<ParameterEntity> parameterDefs = parameterRepository.findByReportIdOrderByPositionAsc(report.getId());

        // Apply user-supplied params
        if (request != null && request.getParams() != null) {
            params.putAll(request.getParams());
        }

        // Fill in defaults for missing parameters using expression resolution
        for (ParameterEntity paramDef : parameterDefs) {
            String paramName = paramDef.getName();
            if (!params.containsKey(paramName) || isBlankValue(params.get(paramName))) {
                String defaultValue = paramDef.getDefaultValue();
                if (defaultValue != null && !defaultValue.isBlank()) {
                    params.put(paramName, expressionResolver.resolve(defaultValue));
                }
            }
        }

        // Step 1: X-Parameter Processing — replace $x{...} blocks with SQL fragments
        XParameterResult xResult = xParameterProcessor.process(sql, params);
        String processedSql = xResult.processedSql();
        List<Object> xBindings = xResult.bindings();

        // Step 2: Build paramTypes map from parameter definitions
        Map<String, String> paramTypes = parameterDefs.stream()
                .collect(Collectors.toMap(
                        ParameterEntity::getName,
                        ParameterEntity::getParamType,
                        (existing, replacement) -> existing
                ));

        // Step 3: SqlParameterBinder — replace :paramName → ? and collect bindings
        BindResult bindResult = sqlParameterBinder.bind(processedSql, params, paramTypes);
        String finalSql = bindResult.processedSql();

        // Step 4: Combine x-param bindings with binder bindings
        List<BindValue> allBindings = new ArrayList<>();
        for (Object xVal : xBindings) {
            allBindings.add(new BindValue(xVal, Types.VARCHAR));
        }
        allBindings.addAll(bindResult.bindings());

        return new ExportBindResult(finalSql, allBindings);
    }

    /**
     * Result of building export SQL with prepared statement bindings.
     *
     * @param sql      the processed SQL with positional {@code ?} placeholders
     * @param bindings ordered list of binding values for PreparedStatement
     */
    private record ExportBindResult(String sql, List<BindValue> bindings) {
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
     * Sanitizes a report name for use as a filename by removing characters
     * that are not safe in filenames across operating systems.
     */
    private String sanitizeFilename(String name) {
        if (name == null || name.isBlank()) {
            return "report";
        }
        // Remove characters that are unsafe in filenames
        return name.replaceAll("[^a-zA-Z0-9._\\- ]", "_").trim();
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
}
