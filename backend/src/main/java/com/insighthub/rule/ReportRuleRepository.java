package com.insighthub.rule;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRuleRepository extends JpaRepository<ReportRuleEntity, Long> {

    List<ReportRuleEntity> findByReportId(Long reportId);

    List<ReportRuleEntity> findByRuleId(Long ruleId);

    void deleteByReportIdAndRuleId(Long reportId, Long ruleId);
}
