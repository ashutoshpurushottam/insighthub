package com.insighthub.rule;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRuleValueRepository extends JpaRepository<UserRuleValueEntity, Long> {

    List<UserRuleValueEntity> findByUserId(Long userId);

    List<UserRuleValueEntity> findByRuleId(Long ruleId);

    List<UserRuleValueEntity> findByUserIdAndRuleId(Long userId, Long ruleId);

    void deleteByUserIdAndRuleId(Long userId, Long ruleId);

    void deleteByUserIdAndRuleIdAndRuleValue(Long userId, Long ruleId, String ruleValue);
}
