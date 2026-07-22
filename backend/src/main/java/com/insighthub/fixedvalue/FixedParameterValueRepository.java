package com.insighthub.fixedvalue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FixedParameterValueRepository extends JpaRepository<FixedParameterValueEntity, Long> {

    Optional<FixedParameterValueEntity> findByParameterIdAndUserId(Long parameterId, Long userId);

    List<FixedParameterValueEntity> findByUserId(Long userId);

    List<FixedParameterValueEntity> findByParameterId(Long parameterId);
}
