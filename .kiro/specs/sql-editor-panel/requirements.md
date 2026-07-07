# Requirements Document

## Introduction

The SQL Editor Panel replaces the existing plain `<textarea>` for SQL input in the InsightHub Report Form with a professional code editing experience. The panel provides SQL syntax highlighting, basic validation, inline query execution with a "Run" button, and a split-pane result display showing query output in a tabular format. The editor integrates with the existing React Hook Form setup so that the SQL content is persisted when saving a report.

## Glossary

- **SQL_Editor**: The code editor component providing syntax-highlighted, editable input for SQL queries within the Report Form.
- **Syntax_Highlighter**: The subsystem within the SQL_Editor responsible for applying color-coded tokens to SQL keywords, strings, numbers, comments, and identifiers.
- **Validator**: The subsystem that performs client-side structural checks on the SQL text to identify basic syntax issues before execution.
- **Run_Button**: The interactive control that triggers execution of the current SQL query against the selected datasource.
- **Result_Pane**: The panel area below or beside the SQL_Editor that displays query execution results, including column headers and row data.
- **Error_Display**: The UI region within the Result_Pane that renders error messages when query execution or validation fails.
- **Split_Panel**: The layout container that divides the editor area and the result area with a resizable or fixed boundary.
- **Form_Integration**: The mechanism by which the SQL_Editor's content is synchronized with the React Hook Form field value (`reportSource`).
- **Datasource**: A configured database connection that queries are executed against; selected via the existing datasource dropdown in the Report Form.

## Requirements

### Requirement 1: SQL Syntax Highlighting

**User Story:** As a report author, I want SQL syntax highlighting in the editor, so that I can easily read and write queries with visual distinctions between keywords, strings, numbers, and comments.

#### Acceptance Criteria

1. WHEN the user types SQL text into the SQL_Editor, THE Syntax_Highlighter SHALL apply a color to SQL keywords (SELECT, FROM, WHERE, JOIN, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, GROUP BY, ORDER BY, HAVING, UNION, LIMIT, OFFSET, AND, OR, NOT, IN, BETWEEN, LIKE, IS, NULL, AS, ON, SET, VALUES, INTO, DISTINCT, COUNT, SUM, AVG, MIN, MAX, CASE, WHEN, THEN, ELSE, END) that is visually distinct from the colors used for strings, numbers, comments, and default text, matching keywords case-insensitively
2. WHEN the SQL text contains single-quoted string literals (including literals with escaped single quotes using ''), THE Syntax_Highlighter SHALL apply a color to those string tokens that is visually distinct from the colors used for keywords, numbers, comments, and default text
3. WHEN the SQL text contains numeric literals (integers, decimal numbers, and numbers in scientific notation such as 1, 3.14, 2.5e10), THE Syntax_Highlighter SHALL apply a color to those number tokens that is visually distinct from the colors used for keywords, strings, comments, and default text
4. WHEN the SQL text contains single-line comments (--) or multi-line comments (/* */), THE Syntax_Highlighter SHALL apply a color to those comment tokens that is visually distinct from the colors used for keywords, strings, numbers, and default text
5. WHILE the user is typing in the SQL_Editor, THE Syntax_Highlighter SHALL apply highlighting within 100 milliseconds of each keystroke for queries up to 5000 characters in length
6. THE SQL_Editor SHALL display text in a monospace font with line numbers in a gutter area
7. THE Syntax_Highlighter SHALL render all text that does not match keywords, strings, numbers, or comments (such as identifiers, operators, and punctuation) in a default text color that is visually distinct from the four highlighted token categories

### Requirement 2: SQL Validation

**User Story:** As a report author, I want the editor to validate my SQL before execution, so that I catch obvious syntax errors without waiting for a server round-trip.

#### Acceptance Criteria

1. WHEN the user triggers query execution, THE Validator SHALL check that the SQL text is not empty and contains no structural errors before sending the request
2. WHEN the SQL text is empty or contains only whitespace, THE Validator SHALL display an inline validation error message "SQL query cannot be empty" and prevent execution
3. WHEN the SQL text contains unmatched parentheses (opening count does not equal closing count), THE Validator SHALL display an inline validation error indicating unbalanced parentheses and prevent execution
4. WHEN the SQL text contains an unclosed string literal (an uneven number of unescaped single-quote characters), THE Validator SHALL display an inline validation error indicating an unclosed string and prevent execution
5. IF one or more validation errors are present, THEN THE Run_Button SHALL remain disabled or the execution request SHALL be blocked until all validation errors are resolved, and THE Validator SHALL clear each error message within 200 milliseconds of the user correcting the corresponding condition
6. WHEN the user triggers query execution with SQL text that has multiple validation errors, THE Validator SHALL display all applicable validation error messages simultaneously rather than only the first detected error

### Requirement 3: Query Execution via Run Button

**User Story:** As a report author, I want a "Run" button to execute my SQL query against the selected datasource, so that I can test and preview results without saving the report first.

#### Acceptance Criteria

1. THE SQL_Editor panel SHALL display a Run_Button with a play icon and the label "Run" positioned in a toolbar area above or adjacent to the editor
2. WHEN the user clicks the Run_Button with SQL text that passes all Validator checks and a datasource is selected, THE SQL_Editor panel SHALL send the query to the backend execution endpoint using the selected datasource ID
3. WHILE the query is executing, THE Run_Button SHALL display a loading state with the text "Running..." and be disabled to prevent duplicate submissions
4. WHEN query execution completes (success or failure), THE Run_Button SHALL return to its enabled state with the original "Run" label
5. WHEN no datasource is selected in the form, THE Run_Button SHALL be disabled and display a tooltip indicating "Select a datasource to run queries"
6. WHEN query execution completes successfully, THE Result_Pane SHALL display the results within the Split_Panel layout
7. WHEN query execution fails with a server error, THE Error_Display SHALL show the error message returned by the backend
8. IF a network or connection failure occurs during query execution preventing a backend response, THEN THE Error_Display SHALL render an error message indicating that the server could not be reached

### Requirement 4: Result Pane Display

**User Story:** As a report author, I want to see query results in a structured table below the editor, so that I can verify my query produces the expected output.

#### Acceptance Criteria

1. THE Split_Panel SHALL divide the SQL editor area (top) and the Result_Pane (bottom) in a vertical layout with a draggable divider that allows the user to resize the two areas
2. WHEN query execution returns data, THE Result_Pane SHALL render a table with column headers matching the result column names
3. WHEN query execution returns data, THE Result_Pane SHALL render each result row with cell values displayed as text, truncating values exceeding 200 characters with an ellipsis (…), and using an em-dash (—) for null values
4. THE Result_Pane SHALL display metadata showing the row count and execution time in milliseconds (e.g., "42 rows • 128ms")
5. WHEN the result set exceeds the visible area, THE Result_Pane SHALL provide both horizontal and vertical scrolling
6. WHEN no query has been executed, THE Result_Pane SHALL display a placeholder message instructing the user to run a query
7. WHEN query execution returns zero rows, THE Result_Pane SHALL display a message "Query returned no data"
8. WHILE a query is executing, THE Result_Pane SHALL display a loading indicator and disable further execution requests until the current execution completes or fails
9. IF query execution fails with an error, THEN THE Result_Pane SHALL display the error message returned by the server and clear any previously displayed results

### Requirement 5: Error Display

**User Story:** As a report author, I want clear error messages when my query fails, so that I can diagnose and fix issues in my SQL.

#### Acceptance Criteria

1. WHEN query execution returns an error from the backend, THE Error_Display SHALL render the error message in a visually distinct error container with a red background or red border styling
2. WHEN a client-side validation error occurs, THE Error_Display SHALL render the validation message directly below the SQL_Editor, outside the Result_Pane
3. WHEN a new query is executed after a previous error, THE Error_Display SHALL clear the previous error before showing new results or a new error
4. THE Error_Display SHALL show the full error text returned by the server without truncation for messages up to 500 characters, and SHALL truncate messages exceeding 500 characters with a "Show more" control that expands to reveal the full text
5. WHEN query execution returns an error or a validation error is displayed, THE Error_Display SHALL mark the error container with an ARIA live region (role="alert" or aria-live="assertive") so that screen readers announce the error message
6. IF a network or connection failure occurs during query execution preventing a backend response, THEN THE Error_Display SHALL render an error message indicating that the server could not be reached

### Requirement 6: React Hook Form Integration

**User Story:** As a report author, I want the SQL editor content to be saved with my report, so that my query persists when I create or update a report.

#### Acceptance Criteria

1. THE SQL_Editor SHALL register its content with the React Hook Form field named `reportSource` such that the form submission payload always contains the current editor text as the `reportSource` value
2. WHEN the user types in the SQL_Editor, THE Form_Integration SHALL update the `reportSource` form field value on each change so that the form's dirty state reflects the modification and the current SQL text is included when the form is submitted
3. WHEN the form is opened in edit mode with an existing report, THE SQL_Editor SHALL populate its content with the existing `reportSource` value from the report
4. IF the `reportSource` value is null or undefined when the form loads, THEN THE SQL_Editor SHALL treat the value as an empty string and display the placeholder hint
5. WHEN the form is opened in create mode, THE SQL_Editor SHALL start with empty content and display a placeholder hint "SELECT * FROM ..."
6. THE SQL_Editor SHALL trigger React Hook Form validation rules when its content changes, marking the field as touched and dirty, consistent with the validation mode configured on the form

### Requirement 7: Editor UX and Accessibility

**User Story:** As a report author, I want the SQL editor to provide standard code editing conveniences, so that writing queries feels natural and productive.

#### Acceptance Criteria

1. WHEN the user presses the Tab key while focused in the SQL_Editor, THE SQL_Editor SHALL insert 2 space characters at the cursor position without moving focus away from the editor
2. WHEN the user presses Escape while focused in the SQL_Editor, THE SQL_Editor SHALL release focus trapping so that subsequent Tab key presses move focus to the next focusable element in the page tab order
3. THE SQL_Editor SHALL support standard keyboard shortcuts for undo (Ctrl/Cmd+Z) and redo (Ctrl/Cmd+Shift+Z) with a minimum undo history of 50 operations
4. THE SQL_Editor SHALL have a minimum height of 200 pixels to provide adequate editing space
5. THE SQL_Editor SHALL include an accessible label or aria-label identifying it as "SQL Query Editor" for screen readers
6. WHEN the user presses Ctrl+Enter or Cmd+Enter while focused in the SQL_Editor, THE SQL_Editor panel SHALL trigger query execution (equivalent to clicking the Run_Button)
7. IF the user presses Ctrl+Enter or Cmd+Enter while query execution is blocked (due to validation failure or no datasource selected), THEN THE SQL_Editor panel SHALL not trigger execution and SHALL retain the existing validation or disabled-state messaging
