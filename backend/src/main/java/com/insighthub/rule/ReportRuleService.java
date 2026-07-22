package com.insighthub.rule;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.report.ReportEntity;
import com.insighthub.report.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportRuleService {

    private final ReportRuleRepository reportRuleRepository;
    private final ReportRepository reportRepository;
    private final RuleRepository ruleRepository;

    public List<ReportRuleDto> getRulesForReport(Long reportId) {
        if (!reportRepository.existsById(reportId)) {
            throw new ResourceNotFoundException("Report", "id", reportId);
        }

        return reportRuleRepository.findByReportId(reportId).stream()
            .map(this::toDto)
            .toList();
    }

    @Transactional
    public ReportRuleDto addRuleToReport(Long reportId, ReportRuleRequest request) {
        ReportEntity report = reportRepository.findById(reportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        RuleEntity rule = ruleRepository.findById(request.getRuleId())
            .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", request.getRuleId()));

        // Check for duplicate mapping
        List<ReportRuleEntity> existing = reportRuleRepository.findByReportId(reportId);
        boolean alreadyMapped = existing.stream()
            .anyMatch(rr -> rr.getRule().getId().equals(request.getRuleId()));
        if (alreadyMapped) {
            throw new IllegalArgumentException(
                "Rule '" + rule.getName() + "' is already mapped to this report");
        }

        ReportRuleEntity entity = ReportRuleEntity.builder()
            .report(report)
            .rule(rule)
            .columnName(request.getColumnName())
            .build();

        return toDto(reportRuleRepository.save(entity));
    }

    @Transactional
    public void removeRuleFromReport(Long reportId, Long ruleId) {
        if (!reportRepository.existsById(reportId)) {
            throw new ResourceNotFoundException("Report", "id", reportId);
        }
        if (!ruleRepository.existsById(ruleId)) {
            throw new ResourceNotFoundException("Rule", "id", ruleId);
        }

        reportRuleRepository.deleteByReportIdAndRuleId(reportId, ruleId);
    }

    private ReportRuleDto toDto(ReportRuleEntity entity) {
        return ReportRuleDto.builder()
            .id(entity.getId())
            .ruleId(entity.getRule().getId())
            .ruleName(entity.getRule().getName())
            .columnName(entity.getColumnName())
            .build();
    }
}
