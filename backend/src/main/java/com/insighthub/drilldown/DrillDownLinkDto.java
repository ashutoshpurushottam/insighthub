package com.insighthub.drilldown;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Response DTO representing a drill-down link with its parameter mappings.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrillDownLinkDto {

    private Long id;
    private Long parentReportId;
    private Long childReportId;
    private String childReportName;
    private String triggerColumn;
    private int position;
    private Map<String, String> paramMappings;

    /**
     * Converts a DrillDownLinkEntity to a DrillDownLinkDto.
     */
    public static DrillDownLinkDto fromEntity(DrillDownLinkEntity entity) {
        Map<String, String> mappings = entity.getParamMappings().stream()
                .collect(Collectors.toMap(
                        DrillDownParamMappingEntity::getParentColumnName,
                        DrillDownParamMappingEntity::getChildParamName
                ));

        return DrillDownLinkDto.builder()
                .id(entity.getId())
                .parentReportId(entity.getParentReport().getId())
                .childReportId(entity.getChildReport().getId())
                .childReportName(entity.getChildReport().getName())
                .triggerColumn(entity.getTriggerColumn())
                .position(entity.getPosition())
                .paramMappings(mappings)
                .build();
    }

    /**
     * Converts a list of entities to DTOs.
     */
    public static List<DrillDownLinkDto> fromEntities(List<DrillDownLinkEntity> entities) {
        return entities.stream()
                .map(DrillDownLinkDto::fromEntity)
                .collect(Collectors.toList());
    }
}
