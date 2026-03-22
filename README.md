# ⚡ Parallax

<p align="center">
  <img src="assets/parallax.png" alt="Parallax Cover" width="800"/>
</p>

> **Paste a complaint. Get an audit. Issue filed.**

AI agent that turns messy user complaints into structured UX audits and auto-filed GitHub issues — no humans needed.

```bash
# 60 seconds from chaos to clarity
Input:  "honestly i have no idea what this product does?? the landing page is so confusing"
Output: GitHub Issue #42 — UX Audit: Score 4.4/10, 5 persona findings, actionable fixes
```

<p align="center">
  <a href="https://parallax-ten-rho.vercel.app">🚀 Live Demo</a> · <a href="https://github.com/Jkanishkha0305/clinicalchatlanding/issues">📋 Sample Issues</a> · <a href="https://vimeo.com/1175977811">🎥 Demo Video</a>
</p>

---

## What It Does

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT (Slack message, support ticket, or pasted complaint) │
│  "the landing page is confusing, users can't figure out     │
│   what ClinicalChat does"                                   │
│                                                             │
│                        ↓                                    │
│                                                             │
│  PARALLAX                                                   │
│  ┌─────────┐   ┌──────────┐   ┌────────────┐   ┌─────────┐│
│  │ Parse   │ → │ Launch   │ → │ Browse +   │ → │ Auto-   ││
│  │ URL +   │   │ 5 AI     │   │ Screenshot │   │ File    ││
│  │ Intent  │   │ Personas │   │ + Analyze  │   │ Issue   ││
│  └─────────┘   └──────────┘   └────────────┘   └─────────┘│
│                                                             │
│                        ↓                                    │
│                                                             │
│  OUTPUT                                                     │
│  GitHub Issue: "UX Audit: Score 4.4/10"                     │
│  - 5 persona perspectives with real screenshots             │
│  - Pain points + highlights per persona                     │
│  - Actionable suggestions prioritized by severity           │
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works

| Step | What Happens |
|------|-------------|
| 1. Complaint arrives | Via Slack @mention, pasted text, or support ticket |
| 2. Parse intent | AI extracts the URL and what the user is complaining about |
| 3. 5 personas browse | Each AI persona autonomously navigates the site with a real browser |
| 4. Score & analyze | Each persona scores the site, identifies pain points and highlights |
| 5. Auto-file issue | Structured GitHub issue filed with all findings |
| 6. Report back | Results posted to Slack (if triggered from Slack) |

---

## Why It Matters

| Old Way | Parallax |
|---------|----------|
| Read complaint | Automatic |
| Manually test the site | 5 AI personas browse autonomously |
| Write up findings | Structured scores + pain points generated |
| File GitHub issue | Auto-filed |
| **Hours of work** | **60 seconds, zero humans** |

---

## The 5 Personas

| Persona | Who They Are | What They Find |
|---------|-------------|----------------|
| 🏃 **Speedrun Steve** | Impatient power user | Extra clicks, slow flows, wasted steps |
| 😕 **Confused Clara** | Non-technical first-timer | Jargon, unclear labels, confusing UX |
| 🔒 **Skeptical Sam** | Privacy advocate | Missing privacy policy, dark patterns |
| ♿ **Accessible Alex** | Keyboard-only user | A11y issues, focus indicators, tab order |
| 🌍 **Global Gita** | Non-English speaker | i18n gaps, cultural assumptions, jargon |

---

## Slack Integration

```
User:      @Parallax the landing page on https://example.com is confusing
Parallax:  🔍 Analyzing... I'll post findings here when done.
Parallax:  🔍 Parallax Analysis: https://example.com
           🏃 Speedrun Steve — Score: 4/10
           😕 Confused Clara — Score: 3/10
           🔒 Skeptical Sam — Score: 3/10
           📊 Overall Score: 3.3/10
Parallax:  📋 GitHub issue filed: https://github.com/your-org/your-repo/issues/2
```

Complaint in Slack → Analysis → GitHub issue → Results posted back. Zero clicks.

---

## Tech Stack

- **AI**: Anthropic Claude (Sonnet) — custom browser tools for navigation
- **Browser**: Playwright + headless Chromium — real screenshots, real clicks
- **Frontend**: Next.js 16 + React 19
- **Streaming**: Server-Sent Events (SSE) for real-time persona updates
- **Integrations**: Slack Events API, GitHub API
- **Validation**: Vercel AI SDK + Zod schemas
- **Deploy**: Vercel

---

## Quick Start

```bash
git clone https://github.com/Jkanishkha0305/parallax.git
cd parallax
npm install
```

Create `.env`:
```
ANTHROPIC_API_KEY=your_key_here
SLACK_BOT_TOKEN=your_slack_token        # optional
GITHUB_TOKEN=your_github_pat            # optional
GITHUB_REPO=https://github.com/org/repo # optional
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

<p align="center">
  <img src="assets/architecture.png" alt="Parallax Architecture" width="800"/>
</p>

---

## Built at EmpireHacks 2026

Track 1: **The Operator** — Messy input in, finished work out.

**Mess in. Issues filed. Loop closed.**
