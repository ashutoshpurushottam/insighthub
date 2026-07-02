package com.insighthub.job;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobExecutionRepository extends JpaRepository<JobExecutionEntity, Long> {

    List<JobExecutionEntity> findByJobIdOrderByStartTimeDesc(Long jobId);

    List<JobExecutionEntity> findByStatus(String status);

    Optional<JobExecutionEntity> findByJobIdAndStatus(Long jobId, String status);
}
