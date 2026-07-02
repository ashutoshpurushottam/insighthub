package com.insighthub.smtp;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SmtpServerRepository extends JpaRepository<SmtpServerEntity, Long> {

    List<SmtpServerEntity> findByActiveTrue();
}
