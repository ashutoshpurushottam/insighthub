# Implementation Plan: Rules & Row-Level Security

## Tasks

- [x] 1. Database migration and entities
  - [x] 1.1 Create Flyway migration for rules tables and reports.uses_rules column
  - [x] 1.2 Create RuleEntity, ReportRuleEntity, UserRuleValueEntity, UserGroupRuleValueEntity
  - [x] 1.3 Create repositories for all rule entities
  - [x] 1.4 Update ReportEntity with usesRules boolean field

- [x] 2. Rule CRUD service and controller
  - [x] 2.1 Create RuleService (CRUD) and RuleDto
  - [x] 2.2 Create RuleController (GET/POST/PUT/DELETE /api/rules)
  - [x] 2.3 Create report-rule mapping endpoints (GET/POST/DELETE /api/reports/{id}/rules)

- [x] 3. Rule Values management
  - [x] 3.1 Create RuleValueService — assign/get/remove values for users and groups
  - [x] 3.2 Create RuleValueController — CRUD endpoints for rule values
  - [x] 3.3 Implement user inheritance: merge user's direct values + group values

- [x] 4. Rule Resolution engine
  - [x] 4.1 Create RuleResolver — generates WHERE clause from user's effective rule values
    - Handle ALL_ITEMS (skip filter), multiple values (IN clause), escaping
  - [x] 4.2 Integrate RuleResolver into ReportExecutionService
    - Replace #rules# placeholder before SQL construction
    - Error if user has no values for a required rule
  - [x] 4.3 Integrate into ExportController for export with rules
  - [x] 4.4 Write unit tests for RuleResolver (normal values, ALL_ITEMS, multiple rules, no values)

- [x] 5. Frontend
  - [x] 5.1 Create RulesPage — CRUD table for rule definitions
  - [x] 5.2 Create ReportRulesManager — manage report-rule mappings (column assignment)
  - [x] 5.3 Create RuleValuesPage — assign values to users/groups per rule
  - [x] 5.4 Add usesRules toggle to ReportBuilderPage General tab
  - [x] 5.5 Add routes for new pages

- [x] 6. Checkpoint — verify rule filtering works end-to-end

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"] },
    { "id": 6, "tasks": ["6"] }
  ]
}
```
