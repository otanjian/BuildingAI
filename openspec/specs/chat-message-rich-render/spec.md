# chat-message-rich-render Specification

## Purpose
TBD - created by archiving change chat-html-echarts-render. Update Purpose after archive.
## Requirements
### Requirement: Safe HTML in assistant messages

The system SHALL render sanitized HTML embedded in assistant message Markdown as rich content, and MUST NOT execute scripts or honor inline event handlers from that HTML.

#### Scenario: Safe HTML tags display

- **GIVEN** an assistant message contains sanitized HTML such as a simple table or formatted spans
- **WHEN** the message is displayed in the chat dialog
- **THEN** the HTML is shown as rich layout rather than only escaped plain text

#### Scenario: Executable HTML is blocked

- **GIVEN** an assistant message contains `<script>` tags or HTML with inline event handlers
- **WHEN** the message is displayed
- **THEN** those executable constructs are not run in the page

### Requirement: ECharts fenced blocks render as charts

The system SHALL treat Markdown fenced code blocks with language `echarts` or `echarts-json` whose body is a JSON object as ECharts options and MUST render them as interactive charts in the chat dialog.

#### Scenario: Valid echarts fence renders chart

- **GIVEN** an assistant message contains a complete `echarts` fenced block with valid option JSON
- **WHEN** the message is displayed
- **THEN** an interactive ECharts chart is shown for that option

#### Scenario: Invalid option falls back to code block

- **GIVEN** an assistant message contains an `echarts` fenced block with invalid JSON or a rejected option shape
- **WHEN** the message is displayed
- **THEN** the system shows a normal code block (and MAY show a brief error hint) instead of a chart

#### Scenario: Incomplete fence during streaming

- **GIVEN** an assistant message is still streaming and an `echarts` fence is incomplete
- **WHEN** the partial content is displayed
- **THEN** the system MUST NOT initialize a chart from the incomplete fence

### Requirement: ECharts loading and cleanup

The system SHALL load the ECharts library on demand when a chart block needs rendering, and MUST dispose chart instances when the corresponding message UI unmounts.

#### Scenario: Lazy load on first chart

- **GIVEN** a conversation has no ECharts blocks until a new assistant message includes one
- **WHEN** that chart block becomes ready to render
- **THEN** ECharts is loaded dynamically without requiring it on the initial chat bundle path for chart-free sessions

#### Scenario: Dispose on unmount

- **GIVEN** a rendered ECharts chart is visible in the dialog
- **WHEN** the message component unmounts or navigates away
- **THEN** the chart instance is disposed and does not leak listeners

