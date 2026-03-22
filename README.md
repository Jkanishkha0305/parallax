# ⚡ Parallax

<p align="center">
  <img src="assets/gen_cover.png" alt="Parallax Cover" width="800"/>
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

## How to Use

### Web UI ([parallax-ten-rho.vercel.app](https://parallax-ten-rho.vercel.app))

1. **Paste a complaint** — type or paste a real user complaint like: *"honestly i spent 5 minutes on your site and i still have no idea what this product does"*
2. **Add your URL** — the app auto-extracts it from the complaint, or enter it manually
3. **Optional: Add GitHub token + repo** — to auto-file issues to your repo
4. **Hit Start Analysis** — 5 AI personas launch and browse your site autonomously
5. **Watch live** — real-time screenshots show each persona clicking, scrolling, and reading
6. **Get results** — scores, pain points, and highlights from each persona
7. **GitHub issue auto-filed** — structured, actionable, ready for your dev team

### Slack Bot

1. Invite `@Parallax` to any channel
2. Type: `@Parallax the checkout flow on https://yoursite.com is broken`
3. Parallax analyzes, posts results, and files a GitHub issue — all in the channel

---

## What It Does

<p align="center">
  <img src="assets/gen_workflow.png" alt="Parallax Workflow" width="800"/>
</p>

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

## Architecture

<p align="center">
  <img src="assets/gen_arch.png" alt="Parallax Architecture" width="800"/>
</p>

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

## Built at EmpireHacks 2026

Track 1: **The Operator** — Messy input in, finished work out.

**Mess in. Issues filed. Loop closed.**
