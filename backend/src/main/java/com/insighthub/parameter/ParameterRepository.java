package com.insighthub.parameter;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParameterRepository extends JpaRepository<ParameterEntity, Long> {

    List<ParameterEntity> findByReportIdOrderByPositionAsc(Long reportId);

    void deleteAllByReportId(Long reportId);
}
