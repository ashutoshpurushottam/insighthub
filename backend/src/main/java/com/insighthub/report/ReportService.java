package com.insighthub.report;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.datasource.DatasourceEntity;
import com.insighthub.datasource.DatasourceRepository;
import com.insighthub.parameter.ParameterEntity;
import com.insighthub.parameter.ParameterRepository;
import com.insighthub.reportgroup.ReportGroupEntity;
import com.insighthub.reportgroup.ReportGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final ReportRepository reportRepository;
    private final ReportGroupRepository reportGroupRepository;
    private final DatasourceRepository datasourceRepository;
    private final ParameterRepository parameterRepository;

    public List<ReportDto> getAllReports() {
        return reportRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    public ReportDto getReportById(Long id) {
        return reportRepository.findById(id)
            .map(this::toDtoWithSource)
            .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));
    }

    @Transactional
    public ReportDto createReport(CreateReportRequest request, String createdBy) {
        ReportGroupEntity group = null;
        if (request.getReportGroupId() != null) {
            group = reportGroupRepository.findById(request.getReportGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("ReportGroup", "id", request.getReportGroupId()));
        }

        DatasourceEntity datasource = null;
        if (request.getDatasourceId() != null) {
            datasource = datasourceRepository.findById(request.getDatasourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Datasource", "id", request.getDatasourceId()));
        }

        ReportEntity entity = ReportEntity.builder()
            .name(request.getName())
            .shortDescription(request.getShortDescription())
            .description(request.getDescription())
            .reportType(request.getReportType())
            .reportGroup(group)
            .datasource(datasource)
            .contactPerson(request.getContactPerson())
            .active(request.isActive())
            .usePreparedStatements(request.isUsePreparedStatements())
            .usesRules(request.isUsesRules())
            .reportSource(request.getReportSource())
            .defaultReportFormat(request.getDefaultReportFormat())
            .createdBy(createdBy)
            .build();

        return toDto(reportRepository.save(entity));
    }

    @Transactional
    public ReportDto updateReport(Long id, CreateReportRequest request, String updatedBy) {
        ReportEntity entity = reportRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));

        entity.setName(request.getName());
        entity.setShortDescription(request.getShortDescription());
        entity.setDescription(request.getDescription());
        entity.setReportType(request.getReportType());
        entity.setContactPerson(request.getContactPerson());
        entity.setActive(request.isActive());
        entity.setUsePreparedStatements(request.isUsePreparedStatements());
        entity.setUsesRules(request.isUsesRules());
        entity.setReportSource(request.getReportSource());
        entity.setDefaultReportFormat(request.getDefaultReportFormat());
        entity.setUpdatedBy(updatedBy);

        if (request.getReportGroupId() != null) {
            entity.setReportGroup(reportGroupRepository.findById(request.getReportGroupId()).orElse(null));
        } else {
            entity.setReportGroup(null);
        }

        if (request.getDatasourceId() != null) {
            entity.setDatasource(datasourceRepository.findById(request.getDatasourceId()).orElse(null));
        } else {
            entity.setDatasource(null);
        }

        return toDto(reportRepository.save(entity));
    }

    @Transactional
    public void deleteReport(Long id) {
        if (!reportRepository.existsById(id)) {
            throw new ResourceNotFoundException("Report", "id", id);
        }
        reportRepository.deleteById(id);
    }

    @Transactional
    public ReportDto cloneReport(Long id, String username) {
        ReportEntity source = reportRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Report", "id", id));

        ReportEntity cloned = ReportEntity.builder()
            .name(source.getName() + " (Copy)")
            .shortDescription(source.getShortDescription())
            .description(source.getDescription())
            .reportType(source.getReportType())
            .reportGroup(source.getReportGroup())
            .datasource(source.getDatasource())
            .contactPerson(source.getContactPerson())
            .active(source.isActive())
            .hidden(source.isHidden())
            .usePreparedStatements(source.isUsePreparedStatements())
            .usesRules(source.isUsesRules())
            .reportSource(source.getReportSource())
            .defaultReportFormat(source.getDefaultReportFormat())
            .createdBy(username)
            .build();

        ReportEntity savedReport = reportRepository.save(cloned);

        // Deep copy parameters (with new IDs), but NOT drill-down links or access rights
        List<ParameterEntity> sourceParams = parameterRepository.findByReportIdOrderByPositionAsc(id);
        for (ParameterEntity sourceParam : sourceParams) {
            ParameterEntity clonedParam = ParameterEntity.builder()
                .report(savedReport)
                .name(sourceParam.getName())
                .label(sourceParam.getLabel())
                .paramType(sourceParam.getParamType())
                .defaultValue(sourceParam.getDefaultValue())
                .placeholder(sourceParam.getPlaceholder())
                .required(sourceParam.isRequired())
                .position(sourceParam.getPosition())
                .lovType(sourceParam.getLovType())
                .lovQuery(sourceParam.getLovQuery())
                .lovStaticValues(sourceParam.getLovStaticValues())
                .multiValue(sourceParam.isMultiValue())
                .dateRangePair(sourceParam.getDateRangePair())
                .build();
            parameterRepository.save(clonedParam);
        }

        return toDtoWithSource(savedReport);
    }

    private ReportDto toDto(ReportEntity report) {
        return ReportDto.builder()
            .id(report.getId())
            .name(report.getName())
            .shortDescription(report.getShortDescription())
            .description(report.getDescription())
            .reportType(report.getReportType())
            .reportGroupId(report.getReportGroup() != null ? report.getReportGroup().getId() : null)
            .reportGroupName(report.getReportGroup() != null ? report.getReportGroup().getName() : null)
            .datasourceId(report.getDatasource() != null ? report.getDatasource().getId() : null)
            .datasourceName(report.getDatasource() != null ? report.getDatasource().getName() : null)
            .contactPerson(report.getContactPerson())
            .active(report.isActive())
            .hidden(report.isHidden())
            .usePreparedStatements(report.isUsePreparedStatements())
            .usesRules(report.isUsesRules())
            .defaultReportFormat(report.getDefaultReportFormat())
            .createdAt(report.getCreatedAt())
            .updatedAt(report.getUpdatedAt())
            .build();
    }

    private ReportDto toDtoWithSource(ReportEntity report) {
        ReportDto dto = toDto(report);
        dto.setReportSource(report.getReportSource());
        return dto;
    }
}
