# Requirements — Parameter Enhancements

## Introduction

This spec covers the next wave of parameter system improvements for the InsightHub Report Engine, based on gaps identified from the ART Admin Manual. These enhancements improve security, flexibility, and user experience of the parameterized query system.

## Requirements

### Requirement 1: Hidden Parameters

**User Story:** As an admin, I want to mark parameters as hidden, so that they are not displayed to users but still participate in SQL substitution with their default or fixed values.

#### Acceptance Criteria

1. A `hidden` boolean field exists on the parameter definition (database, entity, DTO, frontend)
2. When `hidden` is true, the parameter is NOT rendered in the ParameterForm component
3. Hidden parameters still have their default values resolved and substituted into SQL at execution time
4. The ParameterManager (admin) shows a "Hidden" column/indicator for hidden parameters
5. Hidden parameters can still have default values, fixed values, and expression-based defaults

---

### Requirement 2: Date Range Parameter Control

**User Story:** As a user, I want to select a date range (from-date and to-date) using a single picker control, so that I can quickly filter reports by common date ranges.

#### Acceptance Criteria

1. A new parameter type `DATERANGE` is available in the parameter type selector
2. The DATERANGE control renders a date range picker with from-date and to-date inputs
3. The parameter configuration includes `fromParameterName` and `toParameterName` fields that specify which underlying parameters receive the from/to date values
4. Pre-defined range shortcuts are available: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, This Quarter, Last Quarter, This Year, Last Year
5. When the user selects a range, the two underlying parameters are automatically populated
6. The date format is configurable (default: yyyy-MM-dd)
7. The underlying from/to parameters can be hidden (using the Hidden feature) so only the range picker is visible

---

### Requirement 3: Allow Null for Parameters

**User Story:** As a user, I want to be able to pass NULL as a parameter value, so that I can query for records where a column is NULL.

#### Acceptance Criteria

1. A `allowNull` boolean field exists on the parameter definition
2. When `allowNull` is true, a "NULL" checkbox is rendered next to the parameter input in the ParameterForm
3. When the NULL checkbox is checked, the parameter input is disabled and the value `NULL` (without quotes) is substituted into the SQL
4. For x-parameter syntax (`$x{equal,...}`), NULL converts to `column IS NULL`; for `$x{notequal,...}`, NULL converts to `column IS NOT NULL`
5. For standard `:paramName` syntax, NULL substitutes the literal keyword `NULL` (no surrounding quotes)
6. The NULL state can be passed via the execution API request (e.g., a special sentinel value or a separate `nullParams` array)

---

### Requirement 4: Date Arithmetic in Default Values

**User Story:** As an admin, I want to use date arithmetic expressions as parameter defaults, so that reports automatically use relative dates like "yesterday" or "first day of last month".

#### Acceptance Criteria

1. The ExpressionResolver supports `add <unit> <offset>` syntax where unit is one of: days, weeks, months, years, hours, minutes, seconds, milliseconds
2. `add days 1` resolves to tomorrow's date; `add days -1` resolves to yesterday
3. `add months -1` resolves to one month ago
4. `firstday month` resolves to the first day of the current month
5. `firstday month -1` resolves to the first day of the previous month
6. `firstday month +1` resolves to the first day of the next month
7. `firstday year` resolves to January 1st of the current year
8. `lastday month` resolves to the last day of the current month
9. `lastday year` resolves to December 31st of the current year
10. `today` resolves to today's date (yyyy-MM-dd) with time component as 00:00
11. `now` resolves to current date and time (yyyy-MM-dd HH:mm:ss)
12. All date arithmetic results are formatted as yyyy-MM-dd (or yyyy-MM-dd HH:mm:ss for datetime)

---

### Requirement 5: Prepared Statement Binding

**User Story:** As a developer, I want reports to use JDBC prepared statement binding instead of string substitution, so that SQL injection is prevented at the driver level.

#### Acceptance Criteria

1. A new `SqlParameterBinder` class exists that converts `:paramName` placeholders into `?` positional parameters and binds values using `PreparedStatement.setXxx()`
2. The binder determines the JDBC type from the parameter's declared type (TEXT→setString, NUMBER→setDouble, DATE→setDate, DATETIME→setTimestamp, BOOLEAN→setBoolean)
3. Multi-value parameters expand `:paramName` to `?,?,?` (N question marks) and bind each value
4. The `ReportExecutionService` and `ExportController` use the new binder instead of string substitution
5. The existing string-substitution approach (`SqlParameterSubstitutor`) is retained as a fallback for reports that use non-standard syntax (dynamic SQL, XML tags, etc.)
6. A per-report toggle `usePreparedStatements` (default: true for new reports) controls which approach is used

---

### Requirement 6: Fixed Parameter Values per User

**User Story:** As an admin, I want to set fixed parameter values for specific users, so that certain parameters are locked to predetermined values based on who runs the report.

#### Acceptance Criteria

1. A `fixed_parameter_values` table exists with columns: id, user_id, parameter_id, fixed_value
2. An admin API endpoint allows setting/getting/deleting fixed parameter values per user per parameter
3. During report execution, if a fixed value exists for the current user and parameter, it overrides any user-supplied value
4. Fixed values are resolved through the ExpressionResolver (so expressions like `CURRENT_USER` work as fixed values)
5. The parameter is still displayed in the form but shown as read-only/disabled with the fixed value pre-filled
6. A management UI exists (accessible from the parameter configuration) to assign fixed values to users

---

### Requirement 7: X-Parameter Definitions

**User Story:** As a report developer, I want to use `$x{...}` syntax in SQL, so that NULL values and multi-value parameters are handled correctly without manual SQL construction.

#### Acceptance Criteria

1. The SQL processor recognizes `$x{in,column_name,parameter_name}` syntax and generates `column_name IN (?,?,?)` with bound values
2. `$x{notin,column_name,parameter_name}` generates `column_name NOT IN (?,?,?)`
3. `$x{equal,column_name,parameter_name}` generates `column_name = ?` or `column_name IS NULL` when the value is NULL
4. `$x{notequal,column_name,parameter_name}` generates `column_name <> ?` or `column_name IS NOT NULL` when the value is NULL
5. When a multi-value parameter has no values selected, `$x{in,...}` generates `1=0` (always false) and `$x{notin,...}` generates `1=1` (always true)
6. The x-parameter processor runs before prepared statement binding, replacing `$x{...}` blocks with the appropriate SQL fragments and parameter bindings
7. Parameter names in x-parameter syntax are case-sensitive

---

## Glossary

| Term | Definition |
|------|-----------|
| Hidden Parameter | A parameter that participates in SQL execution but is not shown in the user-facing form |
| Date Range Control | A UI widget that lets users pick a from-date and to-date in a single interaction |
| Allow Null | A parameter option enabling the user to explicitly pass NULL as the value |
| Date Arithmetic | Expression syntax for computing dates relative to today (e.g., "add days -1") |
| Prepared Statement Binding | Using JDBC `?` placeholders with `PreparedStatement.setXxx()` instead of string concatenation |
| Fixed Parameter Value | An admin-assigned value that overrides user input for a specific user |
| X-Parameter | A `$x{comparator,column,param}` syntax that generates correct SQL for IN/NULL comparisons |
