## Purpose

Enables BuildingAI console users to access all Taskview project management views inside an embedded iframe with automatic single sign-on, synchronized user accounts, and navigable sub-menus in the BuildingAI sidebar.

## ADDED Requirements

### Requirement: Console sidebar shows Taskview menu group

The BuildingAI console sidebar SHALL display a top-level "我的待办" (My Tasks) GROUP menu item containing child menu items for each Taskview view.

#### Scenario: User sees Taskview menu in sidebar

- **WHEN** a user with console access logs into BuildingAI
- **THEN** the sidebar displays "我的待办" as a GROUP with children: 任务列表, 看板, 图表, 冲刺, 协作, 集成, Webhooks, 消息, 项目时间报告, 分析, 时间报告, 设置, 账户

#### Scenario: Menu items navigate to Taskview iframe

- **WHEN** user clicks a Taskview child menu item (e.g., "看板")
- **THEN** the main content area renders an iframe loading the corresponding Taskview page (e.g., `/:orgSlug/kanban`)

### Requirement: Single sign-on from BuildingAI to Taskview

When a user logs into BuildingAI, the system SHALL obtain a valid Taskview session token and pass it to the embedded iframe so the user is automatically authenticated in Taskview.

#### Scenario: Token obtained on BuildingAI login

- **WHEN** a user successfully authenticates in BuildingAI
- **THEN** the BuildingAI backend calls Taskview's platform-sso endpoint, receives a Taskview access token, and returns it with user info

#### Scenario: Token passed to Taskview iframe

- **WHEN** the TaskviewIframePage renders
- **THEN** the iframe src URL includes `?_t=<base64-encoded Taskview access token>`

#### Scenario: Taskview consumes token on load

- **WHEN** Taskview frontend loads inside the iframe with `_t` parameter
- **THEN** Taskview sets the token in its auth store and the user is authenticated without re-login

### Requirement: User account synchronization

BuildingAI SHALL ensure a corresponding Taskview user account exists for every BuildingAI user, using username as the shared identifier.

#### Scenario: Existing Taskview user matched by username

- **WHEN** a BuildingAI user with username "zhangsan" logs in and a Taskview user with login "zhangsan" exists
- **THEN** the platform-sso call returns tokens for that existing Taskview user

#### Scenario: New Taskview user auto-created

- **WHEN** a BuildingAI user with username "lisi" logs in and no Taskview user with login "lisi" exists
- **THEN** Taskview platform-sso endpoint creates a new user with login "lisi" and returns tokens

### Requirement: Taskview allows iframe embedding from BuildingAI

Taskview SHALL be embeddable in an iframe from the BuildingAI origin.

#### Scenario: BuildingAI can iframe Taskview

- **WHEN** Taskview is loaded inside an iframe hosted on BuildingAI's origin
- **THEN** the browser does not block the iframe due to X-Frame-Options or CSP headers
