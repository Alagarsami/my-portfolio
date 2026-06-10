# My Portfolio Constitution

## Core Principles

### I. Static-First Simplicity
The site must remain a lightweight static frontend with no framework dependency. Use plain HTML, CSS, and vanilla JavaScript unless a future requirement clearly justifies a new dependency. Avoid over-engineering, build-tool complexity, and unnecessary abstraction for a personal portfolio.

### II. Worker-Backed, Minimal Backend Logic
The Cloudflare Worker is only for small, deterministic API tasks such as counting visits and storing or retrieving appreciation messages. The backend must stay thin, fast, and easy to reason about. Any new feature must fit within this simple contract.

### III. Human Ownership, AI as Support
AI may assist with drafting, refactoring, documentation, and test ideas, but the final product must remain understandable, maintainable, and owned by the human developer. AI must not introduce hidden dependencies, opaque logic, or unverified behavior.

### IV. Safety, Respect, and Anti-Abuse
The visitor counter and appreciation wall must be resilient against spam, abuse, and unsafe input. Every API path must validate input, enforce limits, and prevent harmful content from being rendered or stored.

### V. Privacy by Default
Do not collect unnecessary personal data. Use anonymous or minimally identifying signals only. Avoid storing sensitive user information, credentials, or browser fingerprints unless explicitly required and approved.

## Scope and Constraints

This project includes:
- A static personal portfolio website served from simple static hosting.
- A small Cloudflare Worker API for visitor counting and appreciation-wall interactions.
- Lightweight client-side JavaScript for rendering and interaction.

This project does not include:
- Framework-based frontend architecture (React, Vue, Svelte, Next, etc.).
- Complex authentication, user accounts, or admin dashboards.
- Heavy backend services, databases, or external dependencies beyond what is necessary for the Worker.
- Feature creep that changes the purpose of the site into a full application.

## Coding Standards

- Prefer plain HTML, CSS, and vanilla JavaScript.
- Keep files small, readable, and easy to inspect without tooling overhead.
- Use semantic HTML and accessible interactions.
- Avoid unnecessary libraries, bundlers, or transpilation.
- Prefer progressive enhancement: the page should work even if JavaScript fails partially.
- Keep Worker logic simple, with clear request/response contracts and explicit error handling.
- Use comments only when they add clarity; do not comment obvious code.

## AI Collaboration Rules

AI may help with:
- Drafting HTML, CSS, and JavaScript for the portfolio pages.
- Suggesting Worker routes, validation rules, and simple error handling.
- Generating tests, smoke checks, and documentation.
- Refactoring repetitive code while preserving behavior.

AI must not:
- Introduce frameworks, large dependencies, or complex state management without explicit approval.
- Add hidden security bypasses, overly permissive input handling, or opaque logic.
- Replace the human developer’s judgment for design, tone, or project intent.
- Commit to architecture changes that increase complexity beyond the scope of a simple portfolio.

## Worker API Contract

The Worker API must:
- Accept simple, documented requests for visitor count and appreciation-wall submissions.
- Return clear JSON responses with predictable success and error shapes.
- Validate and sanitize all incoming text before storing or rendering.
- Enforce rate limiting and abuse protections on write operations.
- Keep responses small, fast, and resilient to unexpected input.
- Log only minimal operational information needed for debugging.

The Worker API must not:
- Expose admin functions or privileged actions to anonymous users.
- Store passwords, tokens, personal data, or hidden secrets in client-visible responses.
- Allow raw HTML, scripts, or unsafe markup to be submitted or rendered.
- Perform arbitrary remote fetches or third-party processing for simple counter/wall features.
- Become a general-purpose backend for unrelated functionality.

## Security Rules

- Rate-limit write operations per IP and/or user agent to reduce spam and abuse.
- Reject empty, overly long, or repetitive messages.
- Sanitize user input to remove HTML, scripts, and unsafe characters before storage or output.
- Use conservative content policies: no profanity, harassment, hate speech, scams, or link-only spam.
- Keep secrets in Worker environment variables only; never embed them in client-side code.
- Prefer safe defaults and fail closed on validation errors.
- If moderation is added later, it must be explicit and reviewable, not implicit or hidden.

## Development Workflow

- Build features in small increments with simple manual verification.
- Test the static UI and Worker behavior with basic smoke checks after changes.
- Keep changes easy to review and easy to revert.
- If a new dependency or service is introduced, justify it in writing against the project’s simplicity and scope constraints.

## Governance

This constitution governs all work on the portfolio site and its Worker backend. Any deviation from these rules must be documented, justified, and approved before implementation. The project remains intentionally simple: optimize for clarity, safety, and maintainability over feature breadth.

**Version**: 1.0.0 | **Ratified**: 2026-06-10 | **Last Amended**: 2026-06-10
