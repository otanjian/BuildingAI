## ADDED Requirements

### Requirement: Single-screen login form

The web login UI SHALL present account and credential fields on one screen without a blocking “下一步” account step.

#### Scenario: Password login without leaving the screen

- **GIVEN** account password login is enabled
- **WHEN** the user enters a non-mobile account and a password and submits
- **THEN** the system authenticates via account password login and redirects without navigating to a separate password step

#### Scenario: SMS login without leaving the screen

- **GIVEN** phone login is enabled
- **WHEN** the user enters a mobile number, obtains a verification code, enters the code, and submits
- **THEN** the system authenticates via SMS login and redirects without navigating to a separate verification step

### Requirement: SMS-first default mode

When phone login is enabled, the login form SHALL default to SMS credential fields.

#### Scenario: Phone login enabled on load

- **GIVEN** phone login is enabled in login settings
- **WHEN** the login form loads
- **THEN** the verification-code fields are shown by default and the password field is not required until the user chooses password mode

#### Scenario: Only account login enabled

- **GIVEN** phone login is disabled and account login is enabled
- **WHEN** the login form loads
- **THEN** the password field is shown and SMS fields are not shown

### Requirement: Progressive mode switching

The login form SHALL switch between SMS and password credential fields on the same screen based on account input heuristics and explicit user toggles.

#### Scenario: Mobile-shaped input prefers SMS

- **GIVEN** phone login is enabled
- **WHEN** the user enters a value matching a mainland China mobile number pattern
- **THEN** the form shows SMS credential fields (unless the user has explicitly preferred password for the current account)

#### Scenario: Non-mobile input prefers password

- **GIVEN** account login is enabled
- **WHEN** the user enters a username or email that does not match a mobile number pattern
- **THEN** the form shows the password field

#### Scenario: Explicit toggle between modes

- **GIVEN** both phone and account login are enabled and the account looks like a mobile number
- **WHEN** the user chooses “使用密码登录” or “使用验证码登录”
- **THEN** the form switches credential fields in place without changing route or resetting the account value

### Requirement: No blocking account precheck

The login form SHALL NOT require a successful `check-account` response before showing credential fields or allowing submit.

#### Scenario: Submit does not wait on check-account

- **GIVEN** the user is on the login screen
- **WHEN** they fill credentials and submit
- **THEN** the form calls the corresponding login or SMS login API directly (or send-code API for obtaining a code) without a prior mandatory check-account gate

### Requirement: Register remains separate

The login form SHALL keep registration as a separate in-card mode, not merged into the primary login fields.

#### Scenario: Open register from login

- **GIVEN** account registration is enabled
- **WHEN** the user chooses to register
- **THEN** the form shows the register fields and can return to the single-screen login mode
