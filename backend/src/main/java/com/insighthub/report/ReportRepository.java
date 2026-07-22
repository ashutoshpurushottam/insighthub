package com.insighthub.report;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<ReportEntity, Long> {

    List<ReportEntity> findByActiveTrue();

    List<ReportEntity> findByReportGroupId(Long reportGroupId);

    boolean existsByName(String name);

    long countByReportGroupId(Long reportGroupId);
}
