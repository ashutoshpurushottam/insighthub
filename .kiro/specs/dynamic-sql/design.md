# Technical Design — Dynamic SQL

## Overview

Dynamic SQL processing adds three pre-execution transformations to the report pipeline: XML conditional tag resolution, multi-statement handling, and dynamic datasource selection. Optionally, Groovy scripting enables programmatic SQL generation.

## Execution Pipeline Position

```
Existing Pipeline:
  RBAC → Fixed Values → Param Resolution → Validation → Guardrails → [SQL Construction] → Execution

Enhanced Pipeline:
  RBAC → Fixed Values → Param Resolution → Validation → Guardrails
    → XML Tag Resolution (NEW — before param substitution)
    → Rules Injection (#rules#)
    → X-Parameter Processing ($x{...})
    → Parameter Substitution / Binding
    → Multi-Statement Splitting (NEW)
    → Dynamic Datasource Resolution (NEW)
    → Execution
```

## Backend Package Structure

```
com.insighthub/
├── execution/
│   ├── XmlTagProcessor.java              (NEW: <IF>/<TEXT>/<ELSETEXT> resolution)
│   ├── MultiStatementProcessor.java      (NEW: split by ; and select target)
│   ├── DynamicDatasourceResolver.java    (NEW: resolve datasource from parameter)
│   └── GroovyScriptExecutor.java         (NEW: sandboxed Groovy execution)
├── report/
│   ├── ReportEntity.java                 (MODIFIED: add displayResultset, useGroovy)
```

## XML Tag Processor

Parses `<IF>` blocks and evaluates conditions:

```java
public class XmlTagProcessor {
    /**
     * Process all <IF> blocks in the SQL source, replacing them with
     * <TEXT> or <ELSETEXT> content based on condition evaluation.
     * Parameter values are available for EXP1/EXP2 resolution.
     */
    public String process(String sql, Map<String, Object> paramValues);
}
```

Operator implementation:
- `eq`/`equals` → String.equalsIgnoreCase()
- `ln` → Double comparison <
- `gn` → Double comparison >
- `is blank`/`is null` → value == null || value.isBlank()
- `starts with` → String.startsWith() (case-insensitive)
- `contains` → String.contains() (case-insensitive)
- `*_cs` variants → case-sensitive versions

## Multi-Statement Processor

```java
public class MultiStatementProcessor {
    /**
     * Split SQL by semicolons, execute all, return the target resultset.
     * @param displayResultset 0=single, 1..N=Nth stmt, -1=first SELECT, -2=last
     */
    public ResultSet execute(DataSource ds, String sql, int displayResultset, int timeout);
}
```

## Dynamic Datasource Resolution

During execution, if any parameter has type `DATASOURCE`:
1. Get the parameter value (datasource ID or name)
2. Look up the datasource from the repository
3. Create a DataSource from the resolved entity
4. Use this instead of the report's default datasource

## Database Changes

```sql
ALTER TABLE reports ADD COLUMN display_resultset INT DEFAULT 0;
ALTER TABLE reports ADD COLUMN use_groovy BOOLEAN DEFAULT FALSE NOT NULL;
```

## API Changes

No new endpoints. Existing report CRUD endpoints are extended with `displayResultset` and `useGroovy` fields.
