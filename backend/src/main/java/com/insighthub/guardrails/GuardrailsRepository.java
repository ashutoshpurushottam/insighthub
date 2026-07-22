package com.insighthub.guardrails;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GuardrailsRepository extends JpaRepository<GuardrailsConfigEntity, Long> {

    Optional<GuardrailsConfigEntity> findByReportId(Long reportId);

    @Query("SELECT g FROM GuardrailsConfigEntity g WHERE g.report IS NULL")
    Optional<GuardrailsConfigEntity> findGlobal();
}
