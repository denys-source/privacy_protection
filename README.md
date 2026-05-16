# Privacy Assistant

Chrome extension (Manifest V3) with two security features: **PII Redactor** for ChatGPT and **ScamLens** for all websites.

## Features

### PII Redactor
Intercepts text typed into ChatGPT (`chat.openai.com`, `chatgpt.com`) and sends it to a backend redaction API before it's submitted. Sensitive values are replaced with typed placeholders (`[PERSON_1]`, `[CARD_2]`, etc.) — same value always maps to the same placeholder within a session.

Detected types: person names, credit cards, phone numbers, datetime.

### ScamLens
Runs on all other sites. Sends the first 1 000 characters of page text to a backend API and shows a risk overlay (LOW / MEDIUM / HIGH / CRITICAL) with a reason and recommended actions.

**QR Scanner** — scans all `<img>` elements on the page, decodes any QR code, and sends the extracted URL to the backend for analysis. Result shown as an overlay with an option to open or dismiss.

Both features can be toggled and support an allowlist of ignored domains, all configured via the popup.

## Architecture

```
manifest.json
├── content_scripts (ChatGPT only)
│   ├── src/site-adapters.js       — DOM selectors per site
│   ├── src/redactor-service.js    — fetch wrapper for /api/v1/redact/
│   └── src/content.js             — intercept & restore on submit
└── content_scripts (all other URLs)
    ├── jsQR.js                    — QR decode library
    ├── src/qr-service.js          — fetch wrapper for /api/v1/analyze-qr
    ├── src/scam-detection-service.js — fetch wrapper for /api/v1/analyze
    └── src/scam-content.js        — page analysis + QR scan + overlays

background.js   — service worker (storage bridge)
popup.html/.js  — settings UI (toggle, API URLs, ignored sites)
```

## Backend API

The extension expects a backend at `http://localhost:8080` (configurable per-feature in the popup).

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/v1/redact/` | `{ text }` | `{ redactedText, count }` |
| POST | `/api/v1/analyze` | `{ text }` | `{ risk, score, reason, actions[] }` |
| POST | `/api/v1/analyze-qr` | `{ url }` | `{ risk, score, reason, url, qrData }` |

Risk levels: `LOW` · `MEDIUM` · `HIGH` · `CRITICAL` · `UNKNOWN`

## Installation

1. Clone repo.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** → select this directory.
4. Start your backend on `localhost:8080` (or update the API URLs in the popup).
