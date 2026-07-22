package com.insighthub.drilldown;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.parameter.ParameterEntity;
import com.insighthub.parameter.ParameterRepository;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DrillDownService {

    private final DrillDownRepository drillDownRepository;
    private final ReportRepository reportRepository;
    private final ParameterRepository parameterRepository;

    /**
     * Returns all drill-down links for a parent report, ordered by position ascending.
     */
    public List<DrillDownLinkEntity> getDrillDownLinks(Long parentReportId) {
        return drillDownRepository.findByParentReportIdOrderByPositionAsc(parentReportId);
    }

    /**
     * Creates a new drill-down link with parameter mappings.
     * Validates that the child report exists and that all mapped parameter names
     * are defined on the child report.
     *
     * @param parentReportId the parent report ID
     * @param childReportId  the child report ID
     * @param triggerColumn  the column in parent results that triggers drill-down
     * @param position       display ordering position
     * @param paramMappings  map of parent column name → child parameter name
     * @return the persisted DrillDownLinkEntity
     */
    @Transactional
    public DrillDownLinkEntity createDrillDownLink(Long parentReportId,
                                                   Long childReportId,
                                                   String triggerColumn,
                                                   int position,
                                                   Map<String, String> paramMappings) {
        // Validate parent report exists
        ReportEntity parentReport = reportRepository.findById(parentReportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", parentReportId));

        // Validate child report exists
        ReportEntity childReport = reportRepository.findById(childReportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", childReportId));

        // Validate that mapped child param names exist on the child report
        if (paramMappings != null && !paramMappings.isEmpty()) {
            validateChildParameters(childReportId, paramMappings);
        }

        // Build the drill-down link entity
        DrillDownLinkEntity link = DrillDownLinkEntity.builder()
                .parentReport(parentReport)
                .childReport(childReport)
                .triggerColumn(triggerColumn)
                .position(position)
                .build();

        // Add parameter mappings
        if (paramMappings != null) {
            for (Map.Entry<String, String> entry : paramMappings.entrySet()) {
                DrillDownParamMappingEntity mapping = DrillDownParamMappingEntity.builder()
                        .drillDownLink(link)
                        .parentColumnName(entry.getKey())
                        .childParamName(entry.getValue())
                        .build();
                link.getParamMappings().add(mapping);
            }
        }

        return drillDownRepository.save(link);
    }

    /**
     * Deletes a drill-down link by ID. FK cascade handles deletion of associated
     * parameter mappings.
     *
     * @param drillDownLinkId the drill-down link ID to delete
     */
    @Transactional
    public void deleteDrillDownLink(Long drillDownLinkId) {
        if (!drillDownRepository.existsById(drillDownLinkId)) {
            throw new ResourceNotFoundException("DrillDownLink", "id", drillDownLinkId);
        }
        drillDownRepository.deleteById(drillDownLinkId);
    }

    /**
     * Validates that all child parameter names in the mappings correspond to
     * actual parameters defined on the child report.
     */
    private void validateChildParameters(Long childReportId, Map<String, String> paramMappings) {
        List<ParameterEntity> childParams = parameterRepository.findByReportIdOrderByPositionAsc(childReportId);
        Set<String> childParamNames = childParams.stream()
                .map(ParameterEntity::getName)
                .collect(Collectors.toSet());

        List<String> invalidParams = paramMappings.values().stream()
                .filter(paramName -> !childParamNames.contains(paramName))
                .toList();

        if (!invalidParams.isEmpty()) {
            throw new IllegalArgumentException(
                    "Invalid parameter mappings: the following parameters are not defined on the child report: "
                            + String.join(", ", invalidParams));
        }
    }
}
