# Requirements — Rules & Row-Level Security

## Introduction

Rules enable automatic data filtering based on who runs a report. The same report can show different data to different users without requiring separate reports or manual WHERE clauses. This is the ART "Rules" system.

## Requirements

### Requirement 1: Rule Definition

**User Story:** As an admin, I want to define named rules, so that I can create reusable filter definitions that restrict data by user.

#### Acceptance Criteria

1. A Rule entity has: id, name, description
2. Rules are managed via CRUD (Configure | Rules)
3. A report can be linked to one or more rules (uses_rules flag + report-rule mapping)
4. When a report is linked to a rule, the SQL must contain the `#rules#` placeholder where the filter will be injected

---

### Requirement 2: Rule-Report Column Mapping

**User Story:** As an admin, I want to specify which database column a rule applies to for each report, so that the rule filter targets the correct column.

#### Acceptance Criteria

1. A report-rule association specifies the column name that the rule values will filter on (e.g., `employees.region`)
2. Multiple rules can be linked to one report, each with a different column
3. The mapping is managed from the report configuration (More | Rules)

---

### Requirement 3: Rule Values per User/Group

**User Story:** As an admin, I want to assign rule values to users or user groups, so that each user sees only the data they're authorized to view.

#### Acceptance Criteria

1. Rule values are assigned per user per rule (e.g., user "john" for rule "GeoArea" has values "NORTH", "EAST")
2. Rule values can also be assigned per user group per rule
3. Multiple values can be assigned (each generates an IN-clause element)
4. A management page allows adding/removing rule values for users and user groups
5. The special value `ALL_ITEMS` means no filtering is applied for that user/rule

---

### Requirement 4: SQL Injection of Rule Filters

**User Story:** As the execution engine, I want to replace the `#rules#` placeholder with appropriate WHERE clauses, so that data is automatically filtered at query time.

#### Acceptance Criteria

1. During execution, the `#rules#` placeholder is replaced with AND clauses based on the user's rule values
2. For a single rule with values ["NORTH", "EAST"]: `column IN ('NORTH','EAST')`
3. For multiple rules: each generates a separate AND clause, all combined
4. If a user has `ALL_ITEMS` for a rule, that rule's clause is omitted (no filtering)
5. If a report uses rules but the user has no values defined for a rule, execution fails with an error message
6. User group rule values are also considered — a user inherits rule values from their groups
7. Rule values are quoted and escaped (single quotes escaped) to prevent SQL injection

---

### Requirement 5: Rule Integration with Jobs

**User Story:** As the system, I want jobs to apply the job owner's rule values when executing, so that scheduled reports respect data access rules.

#### Acceptance Criteria

1. When a job executes a report that uses rules, the job owner's rule values are applied
2. For shared jobs with splitting enabled, each shared user's rule values are applied to generate separate outputs
3. If the job owner has no rule values for a required rule, the job fails with an error

---

## Glossary

| Term | Definition |
|------|-----------|
| Rule | A named filter definition that restricts report data based on column values |
| Rule Value | A specific value assigned to a user/group for a rule (e.g., "NORTH" for GeoArea) |
| #rules# | A placeholder in report SQL where rule-based WHERE clauses are injected |
| ALL_ITEMS | A special rule value meaning "no filter — show all data" |
