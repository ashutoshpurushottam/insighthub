package com.insighthub.job;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobArchiveRepository extends JpaRepository<JobArchiveEntity, Long> {

    List<JobArchiveEntity> findByJobIdOrderByCreatedAtDesc(Long jobId);
}
