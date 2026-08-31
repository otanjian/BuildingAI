## Purpose

Keeps completed conversations easy to scan while preserving on-demand access to every changed file, its diff details, and available file actions.

## ADDED Requirements

### Requirement: Changed-file groups start collapsed
The OpenCode conversation timeline SHALL initially show a changed-file summary without rendering its file list. The summary SHALL continue to show the total changed-file count and aggregate additions and deletions.

#### Scenario: Completed turn contains changed files
- **WHEN** a completed turn with one or more changed files is displayed
- **THEN** the changed-file summary is visible and the changed-file list is collapsed

### Requirement: Users can expand and collapse changed-file groups
The changed-file summary SHALL be an accessible toggle that reveals the file list on activation and hides it on a subsequent activation. Its expanded state SHALL be exposed to assistive technology.

#### Scenario: User expands a collapsed group
- **WHEN** the user activates the changed-file summary
- **THEN** the changed-file list is displayed and the toggle reports an expanded state

#### Scenario: User collapses an expanded group
- **WHEN** the user activates an expanded changed-file summary
- **THEN** the changed-file list is hidden and the toggle reports a collapsed state

### Requirement: Existing file interactions remain available after expansion
Once a changed-file group is expanded, the system SHALL preserve per-file diff expansion, eligible HTML preview actions, and the existing bounded-list controls for groups containing more than the display limit.

#### Scenario: User interacts with an expanded file list
- **WHEN** the user expands the group and selects a file or its available preview action
- **THEN** the existing file diff or preview behavior is performed

