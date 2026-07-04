package com.insighthub.rule;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserGroupRuleValueRepository extends JpaRepository<UserGroupRuleValueEntity, Long> {

    List<UserGroupRuleValueEntity> findByUserGroupId(Long userGroupId);

    List<UserGroupRuleValueEntity> findByRuleId(Long ruleId);

    List<UserGroupRuleValueEntity> findByUserGroupIdAndRuleId(Long userGroupId, Long ruleId);

    void deleteByUserGroupIdAndRuleId(Long userGroupId, Long ruleId);
}
