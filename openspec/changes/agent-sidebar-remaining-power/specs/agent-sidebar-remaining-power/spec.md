## ADDED Requirements

### Requirement: Show remaining power beside agent consumption rate

The agent detail chat info panel SHALL display the signed-in user's remaining power next to the agent consumption rate text when the user is authenticated and a numeric power balance is available.

#### Scenario: Logged-in user sees remaining power

- **WHEN** a logged-in user opens an agent chat page with the info panel visible
- **THEN** the panel shows the consumption rate and a remaining-power label derived from the user's current power balance

#### Scenario: Logged-out user does not see remaining power

- **WHEN** the info panel is shown without an authenticated user power balance
- **THEN** the panel does not show a remaining-power label

### Requirement: Refresh remaining power after billed usage

When an agent chat turn reports consumed user power, the client SHALL refresh the current user info so the remaining-power label reflects the post-billing balance.

#### Scenario: Balance updates after billed turn

- **WHEN** a chat stream delivers usage that includes a positive `userConsumedPower`
- **THEN** the client refreshes user info used for the remaining-power display
