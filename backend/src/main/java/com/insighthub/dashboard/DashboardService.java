package com.insighthub.dashboard;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final ReportRepository reportRepository;

    public List<DashboardDto> getAllDashboards() {
        return dashboardRepository.findAll().stream().map(this::toDto).toList();
    }

    public DashboardDto getDashboardById(Long id) {
        return dashboardRepository.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Dashboard", "id", id));
    }

    @Transactional
    public DashboardDto createDashboard(DashboardRequest request, String createdBy) {
        DashboardEntity entity = DashboardEntity.builder()
            .name(request.getName())
            .description(request.getDescription())
            .layoutType(request.getLayoutType())
            .columnsCount(request.getColumnsCount())
            .autoRefreshSeconds(request.getAutoRefreshSeconds())
            .active(request.isActive())
            .createdBy(createdBy)
            .build();

        if (request.getItems() != null) {
            for (DashboardItemRequest itemReq : request.getItems()) {
                ReportEntity report = reportRepository.findById(itemReq.getReportId()).orElse(null);
                if (report != null) {
                    DashboardItemEntity item = DashboardItemEntity.builder()
                        .dashboard(entity)
                        .report(report)
                        .title(itemReq.getTitle())
                        .position(itemReq.getPosition())
                        .colSpan(itemReq.getColSpan())
                        .rowSpan(itemReq.getRowSpan())
                        .build();
                    entity.getItems().add(item);
                }
            }
        }

        return toDto(dashboardRepository.save(entity));
    }

    @Transactional
    public DashboardDto updateDashboard(Long id, DashboardRequest request, String updatedBy) {
        DashboardEntity entity = dashboardRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dashboard", "id", id));

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setLayoutType(request.getLayoutType());
        entity.setColumnsCount(request.getColumnsCount());
        entity.setAutoRefreshSeconds(request.getAutoRefreshSeconds());
        entity.setActive(request.isActive());
        entity.setUpdatedBy(updatedBy);

        // Replace items
        entity.getItems().clear();
        if (request.getItems() != null) {
            for (DashboardItemRequest itemReq : request.getItems()) {
                ReportEntity report = reportRepository.findById(itemReq.getReportId()).orElse(null);
                if (report != null) {
                    DashboardItemEntity item = DashboardItemEntity.builder()
                        .dashboard(entity)
                        .report(report)
                        .title(itemReq.getTitle())
                        .position(itemReq.getPosition())
                        .colSpan(itemReq.getColSpan())
                        .rowSpan(itemReq.getRowSpan())
                        .build();
                    entity.getItems().add(item);
                }
            }
        }

        return toDto(dashboardRepository.save(entity));
    }

    @Transactional
    public void deleteDashboard(Long id) {
        if (!dashboardRepository.existsById(id)) {
            throw new ResourceNotFoundException("Dashboard", "id", id);
        }
        dashboardRepository.deleteById(id);
    }

    private DashboardDto toDto(DashboardEntity e) {
        List<DashboardItemDto> items = e.getItems().stream()
            .map(i -> DashboardItemDto.builder()
                .id(i.getId())
                .reportId(i.getReport().getId())
                .reportName(i.getReport().getName())
                .title(i.getTitle())
                .position(i.getPosition())
                .colSpan(i.getColSpan())
                .rowSpan(i.getRowSpan())
                .build())
            .toList();

        return DashboardDto.builder()
            .id(e.getId())
            .name(e.getName())
            .description(e.getDescription())
            .layoutType(e.getLayoutType())
            .columnsCount(e.getColumnsCount())
            .autoRefreshSeconds(e.getAutoRefreshSeconds())
            .active(e.isActive())
            .items(items)
            .createdAt(e.getCreatedAt())
            .updatedAt(e.getUpdatedAt())
            .build();
    }
}
