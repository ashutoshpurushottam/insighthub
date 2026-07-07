# Implementation Plan: Parameter Enhancements

## Overview

This plan implements 7 parameter system enhancements in 5 logical phases: schema migration, expression resolver, execution pipeline (x-params + prepared statements), fixed values, and frontend updates.

## Tasks

- [x] 1. Database migration and entity updates
  - [x] 1.1 Create Flyway migration script for parameter table changes
    - Add `hidden` BOOLEAN DEFAULT FALSE NOT NULL to `parameters`
    - Add `allow_null` BOOLEAN DEFAULT FALSE NOT NULL to `parameters`
    - Add `from_parameter_name` VARCHAR(100) to `parameters`
    - Add `to_parameter_name` VARCHAR(100) to `parameters`
    - Add `use_prepared_statements` BOOLEAN DEFAULT TRUE NOT NULL to `reports`
    - Create `fixed_parameter_values` table with user_id, parameter_id, fixed_value, unique constraint
    - _Requirements: 1, 2, 3, 5, 6_

  - [x] 1.2 Update ParameterEntity with new fields
    - Add `hidden`, `allowNull`, `fromParameterName`, `toParameterName` fields with JPA annotations
    - _Requirements: 1, 2, 3_

  - [x] 1.3 Update ParameterRequest and ParameterDto with new fields
    - Add `hidden`, `allowNull`, `fromParameterName`, `toParameterName` to both classes
    - _Requirements: 1, 2, 3_

  - [x] 1.4 Update ParameterService to handle new fields in create/update/toDto
    - Map new fields in createParameter(), updateParameter(), toDto()
    - _Requirements: 1, 2, 3_

  - [x] 1.5 Update ReportEntity, CreateReportRequest, ReportDto with `usePreparedStatements`
    - Add field to entity, request DTO, and response DTO
    - Update ReportService create/update/toDto mappings
    - _Requirements: 5_

  - [x] 1.6 Create FixedParameterValue entity, repository, DTO
    - Create `FixedParameterValueEntity.java` with id, user, parameter, fixedValue
    - Create `FixedParameterValueRepository.java` with findByParameterIdAndUserId, findByUserId
    - Create `FixedParameterValueDto.java`
    - _Requirements: 6_

- [x] 2. Expression Resolver — Date Arithmetic
  - [x] 2.1 Add `today` and `now` keywords to ExpressionResolver
    - `today` → yyyy-MM-dd with time 00:00
    - `now` → yyyy-MM-dd HH:mm:ss (synonym for existing NOW())
    - _Requirements: 4_

  - [x] 2.2 Implement `add <unit> <offset>` expression syntax
    - Parse "add days 1", "add months -1", "add weeks 2", "add years -1"
    - Also support hours, minutes, seconds, milliseconds
    - Use Java's LocalDate.plus/minus or LocalDateTime.plus/minus
    - Output format: yyyy-MM-dd for date units, yyyy-MM-dd HH:mm:ss for time units
    - _Requirements: 4_

  - [x] 2.3 Implement `firstday` and `lastday` expression syntax
    - `firstday month` → first day of current month
    - `firstday month -1` → first day of previous month
    - `firstday month +1` → first day of next month
    - `firstday year` → Jan 1 of current year
    - `firstday year -1` → Jan 1 of previous year
    - `lastday month` → last day of current month
    - `lastday year` → Dec 31 of current year
    - _Requirements: 4_

  - [x] 2.4 Write unit tests for all new expression syntax
    - Test all `add` variants with positive and negative offsets
    - Test all `firstday`/`lastday` variants
    - Test edge cases: month boundaries, year boundaries, leap years
    - _Requirements: 4_

- [x] 3. X-Parameter Processor
  - [x] 3.1 Create XParameterProcessor class
    - Parse `$x{comparator,column_name,parameter_name}` syntax using regex
    - Support comparators: `in`, `notin`, `equal`, `notequal`
    - Return XParameterResult with modified SQL and ordered binding values
    - _Requirements: 7_

  - [x] 3.2 Implement IN and NOT IN processing
    - `$x{in,col,param}` with values ["A","B"] → `col IN (?,?)` + bindings ["A","B"]
    - `$x{notin,col,param}` with values ["A","B"] → `col NOT IN (?,?)` + bindings ["A","B"]
    - Empty values: `$x{in,...}` → `1=0`; `$x{notin,...}` → `1=1`
    - _Requirements: 7_

  - [x] 3.3 Implement EQUAL and NOT EQUAL processing with NULL support
    - `$x{equal,col,param}` with value "X" → `col = ?` + binding "X"
    - `$x{equal,col,param}` with NULL → `col IS NULL` (no binding)
    - `$x{notequal,col,param}` with value "X" → `col <> ?` + binding "X"
    - `$x{notequal,col,param}` with NULL → `col IS NOT NULL` (no binding)
    - _Requirements: 7_

  - [x] 3.4 Write unit tests for XParameterProcessor
    - Test all 4 comparators with normal values
    - Test NULL handling for equal/notequal
    - Test empty list for in/notin
    - Test multiple $x blocks in same SQL
    - Test case sensitivity of parameter names
    - _Requirements: 7_

- [x] 4. Prepared Statement Binding
  - [x] 4.1 Create SqlParameterBinder class
    - Find all `:paramName` placeholders in SQL
    - Replace each with `?` (for multi-value: expand to `?,?,?`)
    - Build ordered list of BindValue objects with value and JDBC type
    - Return BindResult { processedSql, bindings }
    - _Requirements: 5_

  - [x] 4.2 Implement JDBC type mapping from parameter types
    - TEXT/DROPDOWN → setString
    - NUMBER → setDouble (or setInt if integer)
    - DATE → setDate (java.sql.Date)
    - DATETIME → setTimestamp
    - BOOLEAN → setBoolean
    - Handle NULL values with setNull(index, sqlType)
    - _Requirements: 5_

  - [x] 4.3 Modify StreamingResultSetHandler to accept PreparedStatement path
    - Add overloaded execute() method that takes prepared SQL + bindings
    - Create PreparedStatement, bind parameters, then execute
    - Existing execute() method with raw SQL string remains for fallback
    - _Requirements: 5_

  - [x] 4.4 Integrate into ReportExecutionService
    - Check report.usePreparedStatements flag
    - If true: run XParameterProcessor → SqlParameterBinder → PreparedStatement execution
    - If false: use existing SqlParameterSubstitutor string-substitution path
    - _Requirements: 5_

  - [x] 4.5 Integrate into ExportController
    - Same logic: check flag, use binder or substitutor accordingly
    - _Requirements: 5_

  - [x] 4.6 Write unit tests for SqlParameterBinder
    - Test single-value binding
    - Test multi-value expansion
    - Test NULL binding
    - Test mixed parameters
    - Test no-parameter SQL passes through unchanged
    - _Requirements: 5_

- [x] 5. Fixed Parameter Values
  - [x] 5.1 Create FixedParameterValueService with CRUD operations
    - getFixedValuesForParameter(parameterId) → List<FixedParameterValueDto>
    - getFixedValuesForUser(userId) → List<FixedParameterValueDto>
    - setFixedValue(parameterId, userId, value) → FixedParameterValueDto
    - deleteFixedValue(id)
    - resolveFixedValuesForExecution(reportId, userId) → Map<String, Object>
    - _Requirements: 6_

  - [x] 5.2 Create FixedParameterValueController with REST endpoints
    - GET `/api/parameters/{paramId}/fixed-values`
    - POST `/api/parameters/{paramId}/fixed-values` (body: userId, fixedValue)
    - DELETE `/api/fixed-values/{id}`
    - GET `/api/users/{userId}/fixed-values`
    - _Requirements: 6_

  - [x] 5.3 Integrate fixed values into ReportExecutionService
    - After RBAC check, before parameter resolution: call resolveFixedValuesForExecution()
    - Merge fixed values into params map (they override user-supplied values)
    - Fixed values are passed through ExpressionResolver for expression support
    - _Requirements: 6_

  - [x] 5.4 Write unit tests for FixedParameterValueService
    - Test CRUD operations
    - Test override behavior (fixed value wins over user input)
    - Test expression resolution in fixed values
    - _Requirements: 6_

- [x] 6. Frontend — Parameter Form Enhancements
  - [x] 6.1 Update TypeScript types with new fields
    - Add `hidden`, `allowNull`, `fromParameterName`, `toParameterName` to Parameter interface
    - Add `nullParams` to ExecuteReportRequest interface
    - _Requirements: 1, 2, 3_

  - [x] 6.2 Update ParameterForm to skip hidden parameters
    - Filter out parameters where `hidden === true` before rendering
    - Hidden params still get their default values sent to the execution API
    - _Requirements: 1_

  - [x] 6.3 Implement NullCheckbox component and integrate into ParameterForm
    - When `allowNull` is true, render a "NULL" checkbox next to the parameter input
    - When checked: disable the input, add param name to `nullParams` array in execution request
    - _Requirements: 3_

  - [x] 6.4 Implement DateRangePicker component
    - Two date inputs (from, to) with preset buttons
    - Presets: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, This Quarter, Last Quarter, This Year, Last Year
    - On selection: set values of the fromParameterName and toParameterName params
    - _Requirements: 2_

  - [x] 6.5 Integrate DateRangePicker into ParameterForm
    - When param type is `DATERANGE`, render DateRangePicker instead of standard input
    - Populate the underlying from/to parameters in the form values
    - _Requirements: 2_

  - [x] 6.6 Update ParameterManager form to include new fields
    - Add Hidden toggle, Allow Null toggle in the parameter add/edit modal
    - Add From Parameter Name and To Parameter Name fields (shown only for DATERANGE type)
    - _Requirements: 1, 2, 3_

  - [x] 6.7 Update useReportExecution hook to send nullParams
    - Include `nullParams` array in the execution request body
    - _Requirements: 3_

- [x] 7. Backend — Allow Null handling in execution
  - [x] 7.1 Update ExecuteReportRequest to accept nullParams
    - Add `List<String> nullParams` field
    - _Requirements: 3_

  - [x] 7.2 Handle nullParams in ReportExecutionService
    - After parameter resolution, for each param in nullParams, set its value to a NULL sentinel
    - In SqlParameterBinder: if value is NULL sentinel, use setNull()
    - In SqlParameterSubstitutor (fallback): if value is NULL sentinel, substitute literal `NULL`
    - _Requirements: 3_

- [x] 8. Checkpoint — Integration verification
  - Ensure all tests pass, verify end-to-end: hidden param + date arithmetic default + null checkbox + x-parameter + prepared statement binding.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5", "1.6"] },
    { "id": 2, "tasks": ["1.4", "2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 5, "tasks": ["3.4", "4.2", "4.3", "5.1"] },
    { "id": 6, "tasks": ["4.4", "4.5", "4.6", "5.2", "5.3"] },
    { "id": 7, "tasks": ["5.4", "6.1"] },
    { "id": 8, "tasks": ["6.2", "6.3", "6.4", "6.6", "7.1"] },
    { "id": 9, "tasks": ["6.5", "6.7", "7.2"] },
    { "id": 10, "tasks": ["8"] }
  ]
}
```

## Notes

- Backend tasks (waves 0–7) should be completed before frontend tasks (waves 8–9)
- The prepared statement binder and x-parameter processor are independent and can be developed in parallel
- The existing `SqlParameterSubstitutor` is retained as fallback — it is NOT deleted
- `DATERANGE` is a frontend-only type; on the backend it resolves to two standard DATE parameters
- Fixed parameter values use the same ExpressionResolver, so admins can set fixed values like `CURRENT_USER`
