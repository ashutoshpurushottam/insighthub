# Implementation Plan: SQL Editor Panel

## Overview

Replace the plain `<textarea>` in `ReportFormModal.tsx` with a professional SQL editing experience featuring syntax highlighting, client-side validation, inline query execution, and a split-panel result display. Implementation follows a bottom-up approach: types first, then pure functions (tokenizer, validator), then UI components, then integration with existing form, and finally tests.

## Tasks

- [x] 1. Define shared types and configuration
  - [x] 1.1 Create `sql-editor.types.ts` with all TypeScript interfaces and types
    - Create `src/features/reports/sql-editor/sql-editor.types.ts`
    - Define `TokenType`, `Token`, `ValidationError`, `ValidationErrorType`, `SqlEditorConfig`, `RunReportResult` (or re-export from existing api types), `SqlEditorState`
    - Define component prop interfaces: `SqlEditorPanelProps`, `SqlEditorProps`, `SplitPanelProps`, `ResultPaneProps`, `ErrorDisplayProps`
    - Export the default config constants (keyword set, maxHighlightLength: 5000, tabSize: 2, minHeight: 200, maxUndoHistory: 50, maxErrorDisplayLength: 500, cellTruncateLength: 200)
    - _Requirements: 1.1, 1.5, 1.6, 4.3, 5.4, 7.1, 7.3, 7.4_

- [x] 2. Implement SQL tokenizer
  - [x] 2.1 Create `SqlTokenizer.ts` with the `tokenize` pure function
    - Create `src/features/reports/sql-editor/SqlTokenizer.ts`
    - Implement state-machine tokenizer scanning character-by-character
    - Handle SQL keywords (case-insensitive match against the keyword set from config)
    - Handle single-quoted strings with `''` escape sequences
    - Handle numeric literals (integers, decimals, scientific notation like `2.5e10`)
    - Handle single-line comments (`--` to end of line)
    - Handle multi-line comments (`/* ... */`)
    - All unmatched characters classified as `'default'`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [x] 2.2 Write property test: Tokenizer completeness (round-trip)
    - **Property 1: Tokenizer completeness (round-trip)**
    - Generate random strings including SQL-like content with fast-check
    - Verify `tokenize(s).map(t => t.value).join('') === s` for all inputs
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7**

  - [x] 2.3 Write property test: Keyword classification (case-insensitive)
    - **Property 2: Keyword classification (case-insensitive)**
    - Generate random keyword from the keyword set with random casing variants
    - Verify `tokenize(keyword)` returns exactly one token with `type: 'keyword'`
    - **Validates: Requirements 1.1**

  - [x] 2.4 Write property test: Literal classification
    - **Property 3: Literal classification**
    - Generate valid single-quoted strings (with `''` escapes), valid numeric literals, and valid comments
    - Verify each produces the correct token type (`'string'`, `'number'`, `'comment'`)
    - **Validates: Requirements 1.2, 1.3, 1.4**

- [x] 3. Implement SQL validator
  - [x] 3.1 Create `SqlValidator.ts` with the `validateSql` pure function
    - Create `src/features/reports/sql-editor/SqlValidator.ts`
    - Check 1: Empty/whitespace-only input → `{ type: 'empty', message: 'SQL query cannot be empty' }`
    - Check 2: Count `(` and `)` outside string literals and comments → `{ type: 'unbalanced-parentheses', message: 'Unbalanced parentheses' }`
    - Check 3: Odd number of unescaped `'` outside comments → `{ type: 'unclosed-string', message: 'Unclosed string literal' }`
    - Return all applicable errors simultaneously
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 3.2 Write property test: Empty/whitespace validation
    - **Property 4: Empty/whitespace validation**
    - Generate whitespace-only strings (spaces, tabs, newlines, empty string) with fast-check
    - Verify `validateSql` returns an error with `type: 'empty'`
    - **Validates: Requirements 2.2**

  - [x] 3.3 Write property test: Parenthesis balance validation
    - **Property 5: Parenthesis balance validation**
    - Generate SQL strings with deliberate parenthesis imbalance (outside strings/comments)
    - Verify `validateSql` returns an error with `type: 'unbalanced-parentheses'`
    - **Validates: Requirements 2.3**

  - [x] 3.4 Write property test: Unclosed string validation
    - **Property 6: Unclosed string validation**
    - Generate SQL strings with odd number of unescaped single quotes outside comments
    - Verify `validateSql` returns an error with `type: 'unclosed-string'`
    - **Validates: Requirements 2.4**

- [x] 4. Checkpoint - Verify tokenizer and validator
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Zustand store and API integration
  - [x] 5.1 Create `useSqlEditorStore.ts` Zustand store for execution state
    - Create `src/features/reports/sql-editor/useSqlEditorStore.ts`
    - Define state: `isExecuting`, `result`, `error`, `validationErrors`
    - Implement `execute` action: clears previous state, sets loading, calls API, handles success/error
    - Implement `setValidationErrors`, `clearResults` actions
    - Route to `runReport(reportId)` for saved reports or `runAdHocQuery(datasourceId, sql)` for unsaved
    - _Requirements: 3.2, 3.3, 3.4, 3.7, 3.8_

  - [x] 5.2 Add `runAdHocQuery` API function
    - Add `runAdHocQuery(datasourceId: number, sql: string): Promise<RunReportResult>` to the reports API module
    - Uses `apiClient.post('/reports/run-adhoc', { datasourceId, sql })`
    - _Requirements: 3.2_

- [x] 6. Implement UI components
  - [x] 6.1 Create `ErrorDisplay.tsx` component
    - Create `src/features/reports/sql-editor/ErrorDisplay.tsx`
    - Accept `message` and `type` ('validation' | 'execution') props
    - Render with red styling (`bg-red-50 border-red-200 text-red-800`)
    - Add `role="alert"` and `aria-live="assertive"` for screen reader announcement
    - Truncate messages > 500 chars with "Show more" toggle
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x] 6.2 Write property test: Error message truncation
    - **Property 9: Error message truncation**
    - Generate strings of varying lengths around 500 chars with fast-check
    - Verify: ≤500 chars renders full text; >500 chars renders first 500 + "Show more" control
    - **Validates: Requirements 5.4**

  - [x] 6.3 Create `ResultPane.tsx` component
    - Create `src/features/reports/sql-editor/ResultPane.tsx`
    - Render four states: idle (placeholder), loading (spinner), success (table), error (ErrorDisplay)
    - Success state: metadata bar (row count • execution time), scrollable table with headers and rows
    - Truncate cell values > 200 chars with `'…'`; render null values as `'—'`
    - Zero rows state: "Query returned no data" message
    - Horizontal and vertical scrolling via `overflow-auto`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 6.4 Write property test: Result table column rendering
    - **Property 7: Result table column rendering**
    - Generate arbitrary column name arrays with fast-check
    - Render ResultPane with those columns and verify header cells match in order
    - **Validates: Requirements 4.2**

  - [x] 6.5 Write property test: Cell value formatting
    - **Property 8: Cell value formatting**
    - Generate random strings of varying lengths and nulls with fast-check
    - Verify truncation at 200 chars with `'…'` and null → `'—'`
    - **Validates: Requirements 4.3**

  - [x] 6.6 Create `SplitPanel.tsx` component
    - Create `src/features/reports/sql-editor/SplitPanel.tsx`
    - Flexbox-based vertical layout with top and bottom content areas
    - Draggable divider handle using `onPointerDown`/`onPointerMove`/`onPointerUp`
    - Props: `initialTopRatio` (default 0.6), `minTopHeight` (200px), `minBottomHeight` (100px)
    - _Requirements: 4.1_

  - [x] 6.7 Create `SqlEditor.tsx` component
    - Create `src/features/reports/sql-editor/SqlEditor.tsx`
    - Render hidden `<textarea>` for input capture + overlaid `<pre><code>` for highlighted output
    - Line numbers in a left gutter `<div>`
    - Call `tokenize()` on value changes to produce highlighted spans
    - Keyboard handling: Tab → 2 spaces, Escape → release focus trap, Ctrl/Cmd+Enter → `onExecute` prop
    - Monospace font, minimum height 200px
    - `aria-label="SQL Query Editor"`
    - Support native undo/redo (≥50 operations)
    - Placeholder display when empty: "SELECT * FROM ..."
    - _Requirements: 1.5, 1.6, 7.1, 7.2, 7.3, 7.4, 7.5, 6.4, 6.5_

- [x] 7. Checkpoint - Verify UI components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integrate into ReportFormModal
  - [x] 8.1 Create `SqlEditorPanel.tsx` top-level container
    - Create `src/features/reports/sql-editor/SqlEditorPanel.tsx`
    - Accept `control`, `name`, `datasourceId`, `reportId` props
    - Use `useController` to connect SqlEditor to React Hook Form
    - Render toolbar with Run button (play icon + "Run" label / "Running..." disabled state)
    - Disable Run button when no datasource selected (with tooltip)
    - On Run: validate → if errors, set in store + block; if valid, call `store.execute()`
    - On Ctrl/Cmd+Enter from editor: same as Run click
    - Wire validation errors to display below editor
    - Render SplitPanel with SqlEditor (top) and ResultPane (bottom)
    - Clear validation errors within 200ms of user fixing issues (debounced onChange)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 2.1, 2.5, 5.3, 6.1, 6.2, 6.3, 6.6, 7.6, 7.7_

  - [x] 8.2 Replace `<textarea>` in `ReportFormModal.tsx` with `SqlEditorPanel`
    - Import and use `SqlEditorPanel` in place of the existing `<textarea>` for `reportSource`
    - Pass `control`, `name: 'reportSource'`, `datasourceId` (watched value), and `reportId` (when editing)
    - Switch from `register('reportSource')` to controlled field via `SqlEditorPanel`
    - Verify form submission still includes `reportSource` value
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 9. Checkpoint - Verify full integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Install fast-check and write integration tests
  - [x] 10.1 Install `fast-check` as a dev dependency
    - Run `pnpm add -D fast-check` in the frontend directory
    - Verify it works with Vitest

  - [x] 10.2 Write unit tests for SqlTokenizer
    - Create `src/features/reports/sql-editor/__tests__/SqlTokenizer.test.ts`
    - Test known SQL snippets produce expected token sequences
    - Test edge cases: empty string, only whitespace, very long input, nested comments
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [x] 10.3 Write unit tests for SqlValidator
    - Create `src/features/reports/sql-editor/__tests__/SqlValidator.test.ts`
    - Test specific invalid inputs produce correct error types
    - Test valid SQL returns empty error array
    - Test multiple simultaneous errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 10.4 Write integration tests for SqlEditorPanel
    - Create `src/features/reports/sql-editor/__tests__/SqlEditorPanel.test.tsx`
    - Mount with React Hook Form context, verify form value sync
    - Test Run button states (disabled without datasource, loading during execution)
    - Test Ctrl+Enter triggers execution
    - Test validation errors display and clear
    - _Requirements: 3.1, 3.3, 3.5, 6.1, 6.2, 6.6, 7.6_

- [x] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript, React 18, Vitest, Zustand, React Hook Form, and Tailwind CSS
- `fast-check` needs to be installed as a dev dependency (task 10.1) before property tests can run

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "5.1"] },
    { "id": 3, "tasks": ["6.1", "6.6"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.7"] },
    { "id": 5, "tasks": ["6.4", "6.5", "8.1"] },
    { "id": 6, "tasks": ["8.2"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3", "10.4"] }
  ]
}
```
