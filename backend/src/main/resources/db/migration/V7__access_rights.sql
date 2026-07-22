-- V7: Access Rights - who can see which reports/report groups

-- User access to specific reports
CREATE TABLE user_report_rights (
    user_id    BIGINT NOT NULL,
    report_id  BIGINT NOT NULL,
    PRIMARY KEY (user_id, report_id),
    CONSTRAINT fk_urr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_urr_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- User access to report groups (grants access to all reports in group)
CREATE TABLE user_report_group_rights (
    user_id         BIGINT NOT NULL,
    report_group_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, report_group_id),
    CONSTRAINT fk_urgr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_urgr_group FOREIGN KEY (report_group_id) REFERENCES report_groups(id) ON DELETE CASCADE
);

-- User group access to specific reports
CREATE TABLE user_group_report_rights (
    user_group_id BIGINT NOT NULL,
    report_id     BIGINT NOT NULL,
    PRIMARY KEY (user_group_id, report_id),
    CONSTRAINT fk_ugrr_group FOREIGN KEY (user_group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugrr_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- User group access to report groups
CREATE TABLE user_group_report_group_rights (
    user_group_id   BIGINT NOT NULL,
    report_group_id BIGINT NOT NULL,
    PRIMARY KEY (user_group_id, report_group_id),
    CONSTRAINT fk_ugrgr_group FOREIGN KEY (user_group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugrgr_rgroup FOREIGN KEY (report_group_id) REFERENCES report_groups(id) ON DELETE CASCADE
);
