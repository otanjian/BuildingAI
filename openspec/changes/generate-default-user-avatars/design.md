## Context

See `proposal.md` for motivation. The repository already ships numbered 128×128 PNG files at stable `/static/avatars/<n>.png` URLs. Multiple creation paths select those URLs, but their ranges disagree (33 or 36) while only 34 numbered files exist. Existing database rows already point to this URL scheme, so retaining it avoids migration risk.

## Goals / Non-Goals

**Goals:**

- Replace the numbered gradient assets in place with a unified illustrated portrait library.
- Keep the assets crisp at 48 px while controlling repository and HTTP payload size.
- Centralize the valid library size so all creation paths avoid missing files.

**Non-Goals:**

- Mapping generated faces to users' real-world appearance or protected characteristics.
- Creating one permanent bitmap for every possible future user.
- Changing the custom-avatar upload UI or user entity schema.

## Decisions

### Generate portraits from a reproducible vector system

A project script will compose each portrait from a controlled set of SVG traits: face shape and tone, hairstyle, clothing, glasses or headset, AI halo, and accent palette. Seeded trait selection gives every numbered avatar a stable appearance, while SVG-to-PNG rendering produces the existing 128×128 assets. AI image generation was considered first, but the built-in generator is unavailable in this environment and the API-backed CLI requires separate user authorization. A procedural system avoids that external dependency and makes later regeneration deterministic.

### Use stylized editorial AI portraits rather than photorealistic identities

The portraits will be fictional, shoulders-up, front-facing illustrations with simplified facial detail, clean silhouettes, deep navy backdrops, and controlled cyan/violet/coral/amber accents. This reads clearly at small size and avoids implying that the generated image is a real user's likeness. Literal robots were considered but would make human accounts feel impersonal.

### Replace assets in place

Files `1.png` through `34.png` will keep their names, PNG format, and 128×128 dimensions. This gives all existing users the improvement immediately and avoids database writes.

### Centralize default selection in an API utility

A small API utility will expose the valid count and random URL selection. Console account creation, anonymous/auth registration, WeChat registration, and system initialization will call it only when no custom avatar exists. Random assignment is retained because persisted avatar URLs already make each account stable after creation.

### Stabilize historical system avatars by account identity in the user list

The user list will recognize numbered system-avatar URLs and deterministically remap them from the user ID across the 34 portraits, preserving the source URL's origin. This prevents historical random collisions from showing duplicate faces without altering custom URLs or performing database writes. Hash collisions remain possible once user count exceeds the finite library, but ordinary pages receive much stronger visual differentiation.

## Risks / Trade-offs

- **[Procedural portraits look too similar]** → Combine independently seeded facial, hair, clothing, accessory, halo, and palette traits, then inspect all 34 together.
- **[Simple vectors feel generic]** → Use asymmetric AI halo geometry, layered lighting, expressive face details, and varied technology accessories rather than plain initials or silhouettes.
- **[Encoded assets increase repository size]** → Normalize every portrait to 128×128 and cap encoded size through automated validation.
- **[Legacy `.png` extension contains WebP data]** → This is supported by browsers and the static server; preserve existing URLs and verify actual loading in the product page.

## Migration Plan

Deploy the replacement assets and shared selector together. Existing rows need no migration. Rollback restores the previous numbered assets and inline selection behavior without touching user data.
