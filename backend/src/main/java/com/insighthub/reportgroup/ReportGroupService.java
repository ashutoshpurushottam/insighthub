package com.insighthub.reportgroup;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.report.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportGroupService {

    private final ReportGroupRepository reportGroupRepository;
    private final ReportRepository reportRepository;

    public List<ReportGroupDto> getAllReportGroups() {
        return reportGroupRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    public ReportGroupDto getReportGroupById(Long id) {
        return reportGroupRepository.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("ReportGroup", "id", id));
    }

    @Transactional
    public ReportGroupDto createReportGroup(ReportGroupRequest request) {
        if (reportGroupRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Report group already exists: " + request.getName());
        }

        ReportGroupEntity entity = ReportGroupEntity.builder()
            .name(request.getName())
            .description(request.getDescription())
            .build();

        return toDto(reportGroupRepository.save(entity));
    }

    @Transactional
    public ReportGroupDto updateReportGroup(Long id, ReportGroupRequest request) {
        ReportGroupEntity entity = reportGroupRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("ReportGroup", "id", id));

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());

        return toDto(reportGroupRepository.save(entity));
    }

    @Transactional
    public void deleteReportGroup(Long id) {
        if (!reportGroupRepository.existsById(id)) {
            throw new ResourceNotFoundException("ReportGroup", "id", id);
        }
        long count = reportRepository.countByReportGroupId(id);
        if (count > 0) {
            throw new IllegalArgumentException(
                "Cannot delete: " + count + " report(s) still belong to this group");
        }
        reportGroupRepository.deleteById(id);
    }

    private ReportGroupDto toDto(ReportGroupEntity entity) {
        long count = reportRepository.countByReportGroupId(entity.getId());
        return ReportGroupDto.builder()
            .id(entity.getId())
            .name(entity.getName())
            .description(entity.getDescription())
            .reportCount(count)
            .createdAt(entity.getCreatedAt())
            .updatedAt(entity.getUpdatedAt())
            .build();
    }
}
