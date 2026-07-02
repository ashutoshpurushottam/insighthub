package com.insighthub.job;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<JobEntity, Long> {

    List<JobEntity> findByOwnerUserId(Long ownerUserId);

    List<JobEntity> findByActive(boolean active);

    List<JobEntity> findByActiveTrue();

    /**
     * Find all jobs that have sharing enabled.
     * Used for the shared jobs endpoint — users with access rights can view output of these jobs.
     * NOTE: Once a proper access rights table for jobs is implemented, this query should be
     * refined to filter based on the current user's granted access.
     */
    List<JobEntity> findByAllowSharingTrue();
}
