package com.insighthub.datasource;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DatasourceRepository extends JpaRepository<DatasourceEntity, Long> {
    boolean existsByName(String name);
}
