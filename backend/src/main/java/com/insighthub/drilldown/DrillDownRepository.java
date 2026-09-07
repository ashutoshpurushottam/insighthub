package com.insighthub.drilldown;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DrillDownRepository extends JpaRepository<DrillDownLinkEntity, Long> {

    List<DrillDownLinkEntity> findByParentReportIdOrderByPositionAsc(Long parentReportId);

    @Query("""
            SELECT DISTINCT l FROM DrillDownLinkEntity l
            LEFT JOIN FETCH l.paramMappings
            LEFT JOIN FETCH l.childReport
            WHERE l.parentReport.id = :parentReportId
            ORDER BY l.position ASC
            """)
    List<DrillDownLinkEntity> findByParentReportIdWithMappings(@Param("parentReportId") Long parentReportId);
}
