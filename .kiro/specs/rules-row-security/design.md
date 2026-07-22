# Technical Design — Rules & Row-Level Security

## Overview

Rules inject user-specific WHERE clauses into report SQL at execution time. This provides row-level security without requiring separate reports per user.

## Database Schema

```sql
-- Rule definitions
CREATE TABLE rules (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report-Rule associations (which column a rule filters on for a report)
CREATE TABLE report_rules (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id   BIGINT NOT NULL,
    rule_id     BIGINT NOT NULL,
    column_name VARCHAR(200) NOT NULL,
    CONSTRAINT fk_rr_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_rule FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE,
    CONSTRAINT uq_rr UNIQUE (report_id, rule_id)
);

-- Rule values per user
CREATE TABLE user_rule_values (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    rule_id     BIGINT NOT NULL,
    rule_value  VARCHAR(500) NOT NULL,
    CONSTRAINT fk_urv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_urv_rule FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

-- Rule values per user group
CREATE TABLE user_group_rule_values (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_group_id   BIGINT NOT NULL,
    rule_id         BIGINT NOT NULL,
    rule_value      VARCHAR(500) NOT NULL,
    CONSTRAINT fk_ugrv_group FOREIGN KEY (user_group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugrv_rule FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

-- Add uses_rules flag to reports
ALTER TABLE reports ADD COLUMN uses_rules BOOLEAN DEFAULT FALSE NOT NULL;
```

## Backend Package Structure

```
com.insighthub/
├── rule/
│   ├── RuleEntity.java
│   ├── RuleRepository.java
│   ├── RuleService.java
│   ├── RuleController.java
│   ├── RuleDto.java
│   ├── ReportRuleEntity.java
│   ├── ReportRuleRepository.java
│   ├── UserRuleValueEntity.java
│   ├── UserRuleValueRepository.java
│   ├── UserGroupRuleValueEntity.java
│   ├── UserGroupRuleValueRepository.java
│   ├── RuleValueService.java          (assign/get/remove values)
│   ├── RuleValueController.java       (CRUD for rule values)
│   └── RuleResolver.java              (generates SQL WHERE clause from user's values)
```

## Execution Integration

In `ReportExecutionService`, after parameter resolution and before SQL construction:

```java
if (report.isUsesRules()) {
    String rulesClause = ruleResolver.resolve(reportId, userId);
    sql = sql.replace("#rules#", rulesClause);
}
```

`RuleResolver.resolve()` returns something like:
`employees.region IN ('NORTH','EAST') AND departments.dept_id IN ('10','20')`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/rules` | Rule CRUD |
| GET/POST/DELETE | `/api/reports/{id}/rules` | Report-rule mappings |
| GET/POST/DELETE | `/api/rules/{id}/values` | Rule values (user + group) |
| GET | `/api/users/{id}/rule-values` | All rule values for a user |
