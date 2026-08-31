# opencode-prompt-attachments Specification

## Purpose
TBD - created by archiving change opencode-prompt-image-parts. Update Purpose after archive.
## Requirements
### Requirement: OpenCode prompts include user image attachments
When an OpenCode agent receives a user message that contains image file parts, the system SHALL include those images in the OpenCode `prompt_async` request parts (in addition to any text), using OpenCode file part fields (`type: "file"`, `mime`, `url`, and filename when available).

#### Scenario: Image plus caption
- **WHEN** a user sends an OpenCode chat message with text and an `image/*` file part whose URL is a stored Bowi AI upload URL
- **THEN** the OpenCode prompt contains a text part with that caption and a file part with the image MIME type and URL

#### Scenario: Image without text
- **WHEN** a user sends an OpenCode chat message that has at least one `image/*` file part and no non-empty text
- **THEN** the system still submits the prompt to OpenCode with the image file part(s) and MUST NOT reject the request solely for empty text

#### Scenario: Text-only message unchanged
- **WHEN** a user sends an OpenCode chat message with text and no file parts
- **THEN** the OpenCode prompt contains only text part(s), matching prior text-only behavior

### Requirement: Non-forwardable image URLs are not silently ignored
If a user message includes an image file part that cannot be mapped to a URL OpenCode can consume, the system SHALL NOT pretend the image was delivered: it MUST either rewrite/materialize a usable attachment URL under the conversation artifact constraints, or fail the turn with an explicit error indicating the attachment could not be forwarded.

#### Scenario: Unusable blob URL
- **WHEN** the only image attachment URL is a browser `blob:` URL that was never replaced by an uploaded HTTP(S) URL
- **THEN** the chat turn fails with an explicit attachment-forwarding error (or the system materializes a usable upload/artifact URL before calling OpenCode)

#### Scenario: Localhost upload URL
- **WHEN** an image file part uses a `localhost` or `127.0.0.1` upload URL
- **THEN** the system rewrites or materializes an OpenCode-reachable URL before prompting, or fails explicitly instead of omitting the file part
