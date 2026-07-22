package com.insighthub.reportgroup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportGroupRepository extends JpaRepository<ReportGroupEntity, Long> {
    boolean existsByName(String name);
}
