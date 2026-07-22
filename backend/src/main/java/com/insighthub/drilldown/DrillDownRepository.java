package com.insighthub.drilldown;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DrillDownRepository extends JpaRepository<DrillDownLinkEntity, Long> {

    List<DrillDownLinkEntity> findByParentReportIdOrderByPositionAsc(Long parentReportId);
}
