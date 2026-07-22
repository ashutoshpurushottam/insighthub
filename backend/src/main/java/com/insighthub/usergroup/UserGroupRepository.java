package com.insighthub.usergroup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserGroupRepository extends JpaRepository<UserGroupEntity, Long> {
    boolean existsByName(String name);

    List<UserGroupEntity> findByMembersId(Long userId);
}
