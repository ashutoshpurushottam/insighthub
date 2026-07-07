# Implementation Plan: Dynamic SQL

## Tasks

- [ ] 1. Database migration and entity updates
  - [ ] 1.1 Create Flyway migration: add display_resultset and use_groovy to reports table
  - [ ] 1.2 Update ReportEntity with displayResultset (int) and useGroovy (boolean)
  - [ ] 1.3 Update CreateReportRequest, ReportDto, ReportService to handle new fields
  - [ ] 1.4 Update frontend Report type and ReportBuilderPage General tab with new fields

- [ ] 2. XML Conditional Tag Processor
  - [ ] 2.1 Create XmlTagProcessor class
    - Parse <IF> blocks using regex or XML parser
    - Extract <EXP1>, <OP>, <EXP2>, <TEXT>, <ELSETEXT>
    - Resolve parameter references in EXP1/EXP2
  - [ ] 2.2 Implement all operators
    - eq/equals, neq/not equals, ln, gn, la, ga
    - is blank/is null, is not blank/is not null
    - starts with, ends with, contains
    - Case-sensitive variants (*_cs)
  - [ ] 2.3 Integrate into ReportExecutionService (runs BEFORE param substitution)
  - [ ] 2.4 Write unit tests for XmlTagProcessor
    - Test each operator
    - Test nested/multiple IF blocks
    - Test with parameter references
    - Test ELSETEXT omission (optional tag)

- [ ] 3. Multi-Statement Processor
  - [ ] 3.1 Create MultiStatementProcessor class
    - Split SQL by semicolons (respecting quoted strings)
    - Execute statements sequentially
    - Return appropriate resultset based on displayResultset value
  - [ ] 3.2 Integrate into execution pipeline
    - If displayResultset != 0, use MultiStatementProcessor instead of single-statement execution
  - [ ] 3.3 Write unit tests
    - Test displayResultset values: 1, 2, -1, -2
    - Test mixed SELECT and UPDATE statements

- [ ] 4. Dynamic Datasource Resolution
  - [ ] 4.1 Add DATASOURCE to parameter type options (backend + frontend)
  - [ ] 4.2 Create DynamicDatasourceResolver
    - Check if any parameter has type DATASOURCE
    - Resolve datasource ID/name from parameter value
    - Return DataSource override (or null if not applicable)
  - [ ] 4.3 Integrate into ReportExecutionService and ExportController
    - If dynamic datasource resolved, use it instead of report's configured datasource
  - [ ] 4.4 Write unit tests

- [ ] 5. Groovy Script Support (optional)
  - [ ] 5.1 Add Groovy dependency to pom.xml (org.apache.groovy:groovy)
  - [ ] 5.2 Create GroovyScriptExecutor with sandbox
    - Execute Groovy source, return String (SQL) or List<Map> (data)
    - Bind parameter values as variables
    - Apply whitelist from groovy-whitelist.txt
  - [ ] 5.3 Add enableGroovy application property (default: false)
  - [ ] 5.4 Integrate into execution pipeline (if useGroovy=true, delegate to GroovyScriptExecutor)
  - [ ] 5.5 Write unit tests with security sandbox verification

- [ ] 6. Checkpoint — verify dynamic SQL features end-to-end

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2", "3.1", "4.1"] },
    { "id": 3, "tasks": ["2.3", "2.4", "3.2", "3.3", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "5.5"] },
    { "id": 6, "tasks": ["6"] }
  ]
}
```
