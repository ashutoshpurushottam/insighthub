package com.insighthub.parameter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.datasource.DatasourceEntity;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ParameterService {

    private static final Logger log = LoggerFactory.getLogger(ParameterService.class);

    private final ParameterRepository parameterRepository;
    private final ReportRepository reportRepository;
    private final ObjectMapper objectMapper;
    private final ExpressionResolver expressionResolver;

    public List<ParameterDto> getParametersForReport(Long reportId) {
        return parameterRepository.findByReportIdOrderByPositionAsc(reportId).stream()
            .map(this::toDto)
            .toList();
    }

    public ParameterDto getParameterById(Long id) {
        return parameterRepository.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Parameter", "id", id));
    }

    @Transactional
    public ParameterDto createParameter(Long reportId, ParameterRequest request) {
        ReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        ParameterEntity entity = ParameterEntity.builder()
            .report(report)
            .name(request.getName())
            .label(request.getLabel())
            .paramType(request.getType())
            .defaultValue(request.getDefaultValue())
            .placeholder(request.getPlaceholder())
            .required(request.isRequired())
            .position(request.getPosition())
            .lovType(request.getLovType())
            .lovQuery(request.getLovQuery())
            .lovStaticValues(serializeStaticValues(request.getLovStaticValues()))
            .multiValue(request.isMultiValue())
            .dateRangePair(request.getDateRangePair())
            .hidden(request.isHidden())
            .allowNull(request.isAllowNull())
            .fromParameterName(request.getFromParameterName())
            .toParameterName(request.getToParameterName())
            .build();

        // Set parent parameter reference if provided
        if (request.getParentParamId() != null) {
            ParameterEntity parent = parameterRepository.findById(request.getParentParamId())
                .orElseThrow(() -> new ResourceNotFoundException("Parameter", "id", request.getParentParamId()));
            entity.setParentParam(parent);
        }

        return toDto(parameterRepository.save(entity));
    }

    @Transactional
    public ParameterDto updateParameter(Long id, ParameterRequest request) {
        ParameterEntity entity = parameterRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Parameter", "id", id));

        entity.setName(request.getName());
        entity.setLabel(request.getLabel());
        entity.setParamType(request.getType());
        entity.setDefaultValue(request.getDefaultValue());
        entity.setPlaceholder(request.getPlaceholder());
        entity.setRequired(request.isRequired());
        entity.setPosition(request.getPosition());
        entity.setLovType(request.getLovType());
        entity.setLovQuery(request.getLovQuery());
        entity.setLovStaticValues(serializeStaticValues(request.getLovStaticValues()));
        entity.setMultiValue(request.isMultiValue());
        entity.setDateRangePair(request.getDateRangePair());
        entity.setHidden(request.isHidden());
        entity.setAllowNull(request.isAllowNull());
        entity.setFromParameterName(request.getFromParameterName());
        entity.setToParameterName(request.getToParameterName());

        // Update parent parameter reference
        if (request.getParentParamId() != null) {
            ParameterEntity parent = parameterRepository.findById(request.getParentParamId())
                .orElseThrow(() -> new ResourceNotFoundException("Parameter", "id", request.getParentParamId()));
            entity.setParentParam(parent);
        } else {
            entity.setParentParam(null);
        }

        return toDto(parameterRepository.save(entity));
    }

    @Transactional
    public void deleteParameter(Long id) {
        if (!parameterRepository.existsById(id)) {
            throw new ResourceNotFoundException("Parameter", "id", id);
        }
        parameterRepository.deleteById(id);
    }

    /**
     * Resolves the List-of-Values (LOV) for a parameter.
     * <p>
     * For DYNAMIC LOV: executes the parameter's lov_query against the report's datasource.
     * For STATIC LOV: parses the stored JSON value/label pairs.
     * Supports cascading by binding parentValue into the LOV query.
     * On failure, returns an empty list with error flag (does not throw).
     *
     * @param parameterId the ID of the parameter to resolve LOV for
     * @param parentValue optional parent parameter value for cascading LOV queries
     * @return LovResult containing options list and optional error information
     */
    public LovResult resolveLov(Long parameterId, String parentValue) {
        ParameterEntity parameter = parameterRepository.findById(parameterId)
            .orElseThrow(() -> new ResourceNotFoundException("Parameter", "id", parameterId));

        String lovType = parameter.getLovType();
        if (lovType == null || lovType.isBlank()) {
            return LovResult.success(List.of());
        }

        return switch (lovType.toUpperCase()) {
            case "DYNAMIC" -> resolveDynamicLov(parameter, parentValue);
            case "STATIC" -> resolveStaticLov(parameter);
            default -> LovResult.error("Unknown LOV type: " + lovType);
        };
    }

    /**
     * Resolves a dynamic LOV by executing the parameter's lov_query SQL
     * against the report's configured datasource.
     * <p>
     * The query must return at least 2 columns: first column = value (id),
     * second column = label. If a :parentValue placeholder exists in the query,
     * the provided parentValue is bound to support cascading parameters.
     */
    private LovResult resolveDynamicLov(ParameterEntity parameter, String parentValue) {
        String lovQuery = parameter.getLovQuery();
        if (lovQuery == null || lovQuery.isBlank()) {
            return LovResult.error("Dynamic LOV query is not configured");
        }

        ReportEntity report = parameter.getReport();
        if (report == null) {
            return LovResult.error("Parameter is not associated with a report");
        }

        DatasourceEntity datasource = report.getDatasource();
        if (datasource == null) {
            return LovResult.error("Report does not have a configured datasource");
        }

        try {
            List<LovOption> options = executeLovQuery(datasource, lovQuery, parentValue);
            return LovResult.success(options);
        } catch (Exception e) {
            log.warn("LOV query failed for parameter {}: {}", parameter.getId(), e.getMessage());
            return LovResult.error("LOV query failed: " + e.getMessage());
        }
    }

    /**
     * Executes the LOV query against the given datasource.
     * Supports :parentValue placeholder binding for cascading parameters.
     */
    private List<LovOption> executeLovQuery(DatasourceEntity datasource, String lovQuery, String parentValue) throws Exception {
        if (datasource.getDriver() != null && !datasource.getDriver().isBlank()) {
            Class.forName(datasource.getDriver());
        }

        Properties props = new Properties();
        if (datasource.getUsername() != null) {
            props.put("user", datasource.getUsername());
        }
        if (datasource.getPassword() != null) {
            props.put("password", datasource.getPassword());
        }

        // Replace :parentValue placeholder with a JDBC positional parameter
        boolean hasParentValuePlaceholder = lovQuery.contains(":parentValue");
        String executableQuery = lovQuery;
        if (hasParentValuePlaceholder) {
            executableQuery = lovQuery.replace(":parentValue", "?");
        }

        List<LovOption> options = new ArrayList<>();

        try (Connection conn = DriverManager.getConnection(datasource.getUrl(), props);
             PreparedStatement stmt = conn.prepareStatement(executableQuery)) {

            // Bind parent value if placeholder was present
            if (hasParentValuePlaceholder) {
                stmt.setString(1, parentValue);
            }

            // Set a reasonable timeout (10 seconds) for LOV queries
            stmt.setQueryTimeout(10);

            try (ResultSet rs = stmt.executeQuery()) {
                ResultSetMetaData metaData = rs.getMetaData();
                int columnCount = metaData.getColumnCount();

                while (rs.next()) {
                    String value;
                    String label;

                    if (columnCount >= 2) {
                        // First column = value/id, second column = label
                        value = rs.getString(1);
                        label = rs.getString(2);
                    } else {
                        // Single column: use same value for both
                        value = rs.getString(1);
                        label = value;
                    }

                    options.add(LovOption.builder()
                        .value(value)
                        .label(label)
                        .build());
                }
            }
        }

        return options;
    }

    /**
     * Resolves a static LOV by parsing the parameter's lov_static_values JSON field.
     * Expected format: [{"value":"x","label":"Y"}, ...]
     */
    private LovResult resolveStaticLov(ParameterEntity parameter) {
        String staticValues = parameter.getLovStaticValues();
        if (staticValues == null || staticValues.isBlank()) {
            return LovResult.success(List.of());
        }

        try {
            List<LovOption> options = objectMapper.readValue(
                staticValues, new TypeReference<List<LovOption>>() {});
            return LovResult.success(options);
        } catch (Exception e) {
            log.warn("Failed to parse static LOV values for parameter {}: {}",
                parameter.getId(), e.getMessage());
            return LovResult.error("Failed to parse static LOV values: " + e.getMessage());
        }
    }

    private ParameterDto toDto(ParameterEntity entity) {
        String rawDefault = entity.getDefaultValue();
        String resolved = null;
        if (rawDefault != null && !rawDefault.isBlank()) {
            resolved = expressionResolver.resolve(rawDefault);
        }

        return ParameterDto.builder()
            .id(entity.getId())
            .reportId(entity.getReport().getId())
            .name(entity.getName())
            .label(entity.getLabel())
            .type(entity.getParamType())
            .defaultValue(rawDefault)
            .resolvedDefaultValue(resolved)
            .placeholder(entity.getPlaceholder())
            .required(entity.isRequired())
            .position(entity.getPosition())
            .lovType(entity.getLovType())
            .lovQuery(entity.getLovQuery())
            .lovStaticValues(deserializeStaticValues(entity.getLovStaticValues()))
            .parentParamId(entity.getParentParam() != null ? entity.getParentParam().getId() : null)
            .multiValue(entity.isMultiValue())
            .dateRangePair(entity.getDateRangePair())
            .hidden(entity.isHidden())
            .allowNull(entity.isAllowNull())
            .fromParameterName(entity.getFromParameterName())
            .toParameterName(entity.getToParameterName())
            .build();
    }

    /**
     * Serializes a list of LOV static values to JSON string for database storage.
     */
    private String serializeStaticValues(List<ParameterRequest.LovOptionEntry> entries) {
        if (entries == null || entries.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(entries);
        } catch (Exception e) {
            log.warn("Failed to serialize static LOV values: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Deserializes stored JSON static LOV values into DTO list.
     */
    private List<ParameterDto.LovOptionDto> deserializeStaticValues(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            List<LovOption> options = objectMapper.readValue(
                json, new com.fasterxml.jackson.core.type.TypeReference<List<LovOption>>() {});
            return options.stream()
                .map(opt -> ParameterDto.LovOptionDto.builder()
                    .value(opt.getValue())
                    .label(opt.getLabel())
                    .build())
                .toList();
        } catch (Exception e) {
            log.warn("Failed to deserialize static LOV values: {}", e.getMessage());
            return null;
        }
    }
}
