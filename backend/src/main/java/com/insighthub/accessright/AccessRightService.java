package com.insighthub.accessright;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AccessRightService {

    private final JdbcTemplate jdbc;

    // ===== User -> Reports =====

    public List<Long> getUserReportIds(Long userId) {
        return jdbc.queryForList(
            "SELECT report_id FROM user_report_rights WHERE user_id = ?",
            Long.class, userId);
    }

    @Transactional
    public void setUserReportRights(Long userId, Set<Long> reportIds) {
        jdbc.update("DELETE FROM user_report_rights WHERE user_id = ?", userId);
        for (Long reportId : reportIds) {
            jdbc.update("INSERT INTO user_report_rights (user_id, report_id) VALUES (?, ?)", userId, reportId);
        }
    }

    // ===== User -> Report Groups =====

    public List<Long> getUserReportGroupIds(Long userId) {
        return jdbc.queryForList(
            "SELECT report_group_id FROM user_report_group_rights WHERE user_id = ?",
            Long.class, userId);
    }

    @Transactional
    public void setUserReportGroupRights(Long userId, Set<Long> groupIds) {
        jdbc.update("DELETE FROM user_report_group_rights WHERE user_id = ?", userId);
        for (Long groupId : groupIds) {
            jdbc.update("INSERT INTO user_report_group_rights (user_id, report_group_id) VALUES (?, ?)", userId, groupId);
        }
    }

    // ===== UserGroup -> Reports =====

    public List<Long> getUserGroupReportIds(Long groupId) {
        return jdbc.queryForList(
            "SELECT report_id FROM user_group_report_rights WHERE user_group_id = ?",
            Long.class, groupId);
    }

    @Transactional
    public void setUserGroupReportRights(Long groupId, Set<Long> reportIds) {
        jdbc.update("DELETE FROM user_group_report_rights WHERE user_group_id = ?", groupId);
        for (Long reportId : reportIds) {
            jdbc.update("INSERT INTO user_group_report_rights (user_group_id, report_id) VALUES (?, ?)", groupId, reportId);
        }
    }

    // ===== UserGroup -> Report Groups =====

    public List<Long> getUserGroupReportGroupIds(Long groupId) {
        return jdbc.queryForList(
            "SELECT report_group_id FROM user_group_report_group_rights WHERE user_group_id = ?",
            Long.class, groupId);
    }

    @Transactional
    public void setUserGroupReportGroupRights(Long groupId, Set<Long> reportGroupIds) {
        jdbc.update("DELETE FROM user_group_report_group_rights WHERE user_group_id = ?", groupId);
        for (Long rgId : reportGroupIds) {
            jdbc.update("INSERT INTO user_group_report_group_rights (user_group_id, report_group_id) VALUES (?, ?)", groupId, rgId);
        }
    }
}
