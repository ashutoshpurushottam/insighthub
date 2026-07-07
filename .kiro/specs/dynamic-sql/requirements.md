# Requirements — Dynamic SQL

## Introduction

Dynamic SQL allows report queries to be modified at runtime based on parameter values. This enables conditional WHERE clauses, different table selections, and entirely different queries depending on user input — without creating multiple reports.

## Requirements

### Requirement 1: XML Conditional Tags

**User Story:** As a report developer, I want to use XML conditional tags in SQL, so that parts of the query are included or excluded based on parameter values.

#### Acceptance Criteria

1. The `<IF>` tag defines a conditional block with `<EXP1>`, `<OP>`, `<EXP2>`, `<TEXT>`, `<ELSETEXT>` sub-tags
2. If the condition (EXP1 OP EXP2) is true, the `<TEXT>` content is used; otherwise `<ELSETEXT>` is used
3. EXP1 and EXP2 can contain parameter references (`#param_name#`) or static values
4. Supported operators: eq/equals, neq/not equals, ln (less than numeric), gn (greater than numeric), la/ga (alphabetic), is blank/is null, is not blank/is not null, starts with, ends with, contains
5. Both case-sensitive and case-insensitive variants are supported (e.g., `equals cs`)
6. Multiple `<IF>` blocks can appear in the same SQL
7. `<IF>` blocks are resolved BEFORE parameter substitution occurs
8. Tag names are case-sensitive (uppercase)

---

### Requirement 2: Multiple Statements

**User Story:** As a report developer, I want to include multiple SQL statements in a report, so that I can create temp tables or run setup before the main SELECT.

#### Acceptance Criteria

1. Multiple statements in the SQL source are separated by `;`
2. A "Display Resultset" field on the report controls which statement provides the output:
   - 0 = single statement (no multi-statement processing)
   - 1, 2, ... N = use the Nth statement
   - -1 = use the first SELECT statement
   - -2 = use the last statement
3. All statements are executed in order
4. Non-SELECT statements produce no output (but are still executed)

---

### Requirement 3: Dynamic Datasources

**User Story:** As a report developer, I want users to select which database a report runs against at runtime, so that the same SQL can query different environments.

#### Acceptance Criteria

1. A parameter with data type "DATASOURCE" allows runtime datasource selection
2. The parameter value should be a datasource ID or datasource name
3. At execution time, the report uses the dynamically selected datasource instead of its configured one
4. If the value is numeric, it's treated as a datasource ID; otherwise as a datasource name
5. The report's configured datasource acts as the default fallback

---

### Requirement 4: Groovy Script Support (Optional/Advanced)

**User Story:** As a report developer, I want to use Groovy scripts in the SQL source, so that I can programmatically generate SQL or return data directly.

#### Acceptance Criteria

1. A "Use Groovy" flag on the report indicates the source is Groovy (not SQL)
2. The Groovy script can return a String (SQL to execute) or a List<Map> (direct data)
3. Parameter values are accessible via `paramName.value` syntax
4. Groovy execution is sandboxed with a whitelist of allowed classes
5. A `enableGroovy` application setting controls whether Groovy execution is permitted (default: false)

---

## Glossary

| Term | Definition |
|------|-----------|
| XML Conditional Tags | `<IF>/<TEXT>/<ELSETEXT>` blocks that conditionally include SQL fragments |
| Display Resultset | Field controlling which statement in a multi-statement source provides output |
| Dynamic Datasource | A parameter-driven datasource selection at runtime |
| Groovy Script | JVM-based scripting for dynamic SQL generation |
