# Portfolio Site Specification

**Project**: Personal portfolio website with visitor counter and appreciation wall
**Status**: Draft
**Created**: 2026-06-10

## 1. Overview

This specification defines the MVP for a simple static portfolio website with:
- a visitor counter
- an appreciation wall for short public messages
- a lightweight Cloudflare Worker API to support those interactions

The implementation must follow the constitution in this repository: static-first, vanilla JavaScript only, minimal backend logic, strong input validation, and anti-abuse safeguards.

## 2. User Scenarios and Acceptance Criteria

### User Story 1 — View the portfolio and see live engagement (Priority: P1)
A visitor opens the site and can quickly understand who the person is, what they have built, and that the site includes simple community engagement features.

**Acceptance Scenarios**:
1. Given the site is loaded, When the page renders, Then the visitor sees a Hero section, a Work section, and a Skills section.
2. Given the site is loaded, When the visitor counter endpoint responds, Then the displayed count updates without refreshing the whole page.
3. Given the site is loaded, When the Worker is unavailable or returns an error, Then the page degrades gracefully and shows a fallback message rather than crashing.

### User Story 2 — Submit an appreciation message (Priority: P1)
A visitor can submit a short, respectful message to the appreciation wall.

**Acceptance Scenarios**:
1. Given a visitor enters a valid message, When they submit the form, Then the Worker validates it and stores it if allowed.
2. Given a visitor enters invalid or abusive text, When they submit, Then the request is rejected with a clear validation error.
3. Given a visitor submits too frequently, When the rate limit is exceeded, Then the request is rejected with a retry-friendly response.

### User Story 3 — View recent appreciation messages (Priority: P2)
A visitor can browse the appreciation wall and see public messages in a readable format.

**Acceptance Scenarios**:
1. Given the wall has stored messages, When the page loads, Then recent messages are displayed in reverse chronological order.
2. Given there are no messages, When the wall loads, Then the UI shows an empty-state message instead of a broken layout.

## 3. Functional Requirements

### FR-001 — Visitor Counter
The system MUST show a visitor count on the page.
- The count MUST be retrieved from the Worker API.
- The count MUST be updated without a full page reload when possible.
- The count MUST be treated as a best-effort, non-authoritative number if the Worker is unavailable.

### FR-002 — Visitor Count Behavior
The system MUST increment or record a visit when the page is opened.
- The Worker MUST avoid double-counting the same visit from the same client in a short window.
- The Worker MUST handle repeated requests safely.
- The Worker MUST not require authentication for this simple feature.

### FR-003 — Appreciation Wall Submission
The system MUST allow visitors to submit public appreciation messages.
- Messages MUST be limited to a sensible maximum length (recommended: 280 characters).
- Messages MUST be trimmed before validation and storage.
- Messages MUST be rejected if they contain unsafe HTML or script content.
- Messages MUST be rejected if they are empty or only whitespace.

### FR-004 — Appreciation Wall Display
The system MUST display stored messages to visitors.
- Messages MUST be shown in reverse chronological order.
- The UI MUST render text safely and avoid interpreting user content as HTML.
- The UI MUST handle missing or malformed data gracefully.

### FR-005 — Portfolio Sections
The site MUST include the following sections:
- Hero: introduction, short summary, and primary call-to-action or personal tagline
- Work: selected projects or experiences with concise descriptions
- Skills: core technical skills and strengths

### FR-006 — Worker API Endpoints
The Worker MUST expose the endpoints defined in Section 6.
- The API MUST return JSON with consistent success and error structures.
- The API MUST reject invalid input with explicit error messages.
- The API MUST limit write operations to reduce spam.

### FR-007 — Data Persistence
The Worker MUST store data in Cloudflare KV using a simple key structure defined in Section 7.
- Visitor count data MUST be stored as a small structured record.
- Appreciation messages MUST be stored as a list or record with metadata.
- KV writes MUST be minimal and deterministic.

## 4. Feature Details

### 4.1 Visitor Counter Feature
How it works:
1. The browser loads the static page.
2. The client calls a Worker endpoint to fetch the current visit count.
3. The Worker returns the current value and optionally records a visit event.
4. The client updates the counter display in the UI.

Edge cases:
- If the Worker fails, the page shows a fallback value or a neutral message.
- If the same visitor refreshes the page repeatedly, the counter should not inflate incorrectly due to duplicate counting.
- If the Worker returns malformed data, the client must ignore it and show a safe fallback.
- If the request is rate-limited, the counter should still display the last known value rather than fail completely.

### 4.2 Appreciation Wall Feature
Submission flow:
1. The user enters a message in the form.
2. The client validates the input on the client side for usability.
3. The Worker performs the final validation and rate-limit check.
4. If accepted, the Worker stores the message in KV.
5. The client updates the wall view and shows a success state.

Display behavior:
- The wall displays a limited number of recent messages for performance and readability.
- Each message includes a safe display string and timestamp.
- The UI prevents raw HTML from being rendered.

Validation rules:
- Reject empty messages.
- Reject messages over the configured length limit.
- Reject obvious spam, repeated text, or profanity/hate/harassment content.
- Reject malformed input that cannot be safely stored.

## 5. Portfolio Content Requirements

### Hero Section
- A short introduction or tagline
- A concise summary of the person’s identity and current focus
- A simple visual style that stays lightweight and accessible

### Work Section
- A small set of featured projects or experiences
- Short descriptions with clear outcomes or focus areas
- No excessive text or heavy media

### Skills Section
- A concise list of technical strengths and tools
- Readable grouping by category if needed
- No dependency on third-party frameworks or complex UI libraries

## 6. Worker API Endpoints

### GET /api/visit
Purpose: fetch the current visitor count and optionally record one visit.

Request shape:
- No required body
- Optional query: ?track=1

Response shape:
{
  "ok": true,
  "count": 128,
  "tracked": true,
  "generatedAt": "2026-06-10T12:34:56.000Z"
}

Error shape:
{
  "ok": false,
  "error": "rate_limited",
  "message": "Too many requests. Please try again later."
}

### GET /api/wall
Purpose: fetch recent appreciation messages.

Request shape:
- Optional query: ?limit=10

Response shape:
{
  "ok": true,
  "messages": [
    {
      "id": "msg_001",
      "text": "Great work!",
      "createdAt": "2026-06-10T12:30:00.000Z"
    }
  ]
}

### POST /api/wall
Purpose: add a new appreciation message.

Request shape:
{
  "text": "Love the portfolio design!"
}

Response shape on success:
{
  "ok": true,
  "message": {
    "id": "msg_002",
    "text": "Love the portfolio design!",
    "createdAt": "2026-06-10T12:35:00.000Z"
  }
}

Response shape on validation or abuse failure:
{
  "ok": false,
  "error": "invalid_input",
  "message": "Message is too long or contains unsafe content."
}

## 7. Cloudflare KV Data Model

### KV Namespace
Use one KV namespace for the portfolio app data.

### Keys
- `visit:counter` → stores the current visitor count as a JSON object
  {
    "count": 128,
    "updatedAt": "2026-06-10T12:34:56.000Z"
  }

- `visit:meta` → stores simple visitor tracking metadata if needed
  {
    "lastSeenAt": "2026-06-10T12:34:56.000Z",
    "lastClientHash": "sha256:..."
  }

- `wall:messages` → stores the appreciation wall entries as an array of objects
  [
    {
      "id": "msg_001",
      "text": "Great work!",
      "createdAt": "2026-06-10T12:30:00.000Z"
    }
  ]

### Data Rules
- Keep the count value simple and increment-only.
- Keep the wall list bounded to a reasonable number of recent entries.
- Do not store sensitive user data or personal identifiers.
- All stored text must be sanitized before writing.

## 8. Non-Functional Requirements

### Performance
- Initial page load should be fast and lightweight.
- The Worker API should respond within a few hundred milliseconds for normal use.
- The site should avoid unnecessary assets, large libraries, or heavy animation.

### Accessibility
- The site must use semantic HTML and keyboard-friendly controls.
- Text contrast must be readable and meet common accessibility expectations.
- Forms must have clear labels and visible validation feedback.
- The page must remain usable when JavaScript is disabled or partially unavailable.

### Reliability
- The page must degrade gracefully if the Worker is unavailable.
- Errors must not break the portfolio page or expose stack traces to users.

### Security
- All write operations must be rate-limited.
- Input must be sanitized defensively.
- No secrets or private data may be exposed in client code.

## 9. Success Criteria

- Visitors can view the portfolio and see the visitor counter.
- Visitors can submit and view appreciation messages without framework overhead.
- The Worker handles common requests safely and returns clear JSON errors.
- The site remains lightweight, accessible, and easy to maintain.
