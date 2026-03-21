# Parallax — 3 Minute Pitch Script

---

## [0:00] HOOK

> "Every UX bug you ship costs you users. But how do you actually know what users
> experience before they leave?"

---

## [0:30] PROBLEM

> "Traditional UX testing is slow, expensive, and doesn't scale. You can't hire
> testers for every feature. Static analysis only catches code — not confusion,
> frustration, or accessibility failures. By the time you find out, users are
> already gone."

---

## [1:00] SOLUTION

> "We built Parallax — an autonomous UX testing agent powered by Gemini 2.5
> Computer Use. You give it any URL, and it launches 5 AI personas simultaneously:"

> "Speedrun Steve finds unnecessary friction. Confused Clara spots unclear labels.
> Skeptical Sam flags dark patterns. Accessible Alex catches accessibility failures.
> Global Gita finds i18n gaps."

> "These aren't bots — they're agents that actually see your UI and navigate it
> like a human."

---

## [1:45] DEMO

> "Let me show you. I'll paste a URL, hit analyze, and in under 60 seconds —
> 5 agents are navigating, taking screenshots, and generating thought bubbles
> in real-time. Each one reports pain points, gives you a score, and tells you
> exactly what to fix."

**[ Paste URL → hit Analyze → narrate screenshots streaming in ]**

---

## [2:00] USE CASE

> "Here's a real scenario. A startup is about to launch their onboarding flow.
> Their engineers think it's clean. Their designer thinks it's intuitive."

> "They run Parallax. Clara can't find the 'skip' button. Sam refuses to connect
> his Google account because there's no privacy policy linked. Alex can't tab
> through the form at all."

> "Three critical bugs. Found in 60 seconds. Before a single real user saw it."

> "That's the value — not after launch, not from support tickets, not from churn.
> Before it ships."

---

## [2:15] IMPACT

> "No static analysis. No surveys. No user lab. Just paste a URL, get actionable
> UX insights in seconds. Parallax Score tells you how your site performs.
> AI-generated suggestions tell you what to fix first. GitHub integration tells
> you which files to touch."

---

## [2:45] CLOSE

> "Parallax — real user insights from AI agents."

> "Because your users won't fill out a feedback form. They'll just leave."

---

## Timing Guide

| Section | Time | What to Do |
|---|---|---|
| Hook | 0:00 | Eye contact, no demo yet |
| Problem | 0:30 | Let it sink in |
| Solution | 1:00 | Name each persona clearly |
| Demo | 1:45 | Paste URL, narrate live |
| Use Case | 2:00 | Tell the startup story |
| Impact | 2:15 | Point to the score + suggestions |
| Close | 2:45 | Slow down, make it land |

---

## Key Lines to Memorize

- *"These aren't bots — they're agents that actually see your UI."*
- *"Three critical bugs. Found in 60 seconds. Before a single real user saw it."*
- *"Your users won't fill out a feedback form. They'll just leave."*

---

## If the Demo is Slow

> *"First request spins up a fresh browser on a serverless function —
> you're watching a cold start live. No pre-recorded fakes.
> Real infrastructure, real browser."*

---

## Judge Q&A

| Question | Answer |
|---|---|
| "Is it a real browser?" | "Yes — Playwright headless Chromium. Gemini sees actual screenshots and clicks." |
| "How is this different from Hotjar?" | "Hotjar records real users after the fact. This runs before you have users." |
| "Can it test any site?" | "Any public URL. Paste and go." |
| "What is Gemini Computer Use doing?" | "It sees a screenshot and decides where to click — like a human. No DOM, no CSS selectors." |
| "Why Vercel AI SDK?" | "For structured output — generateObject with Zod gives type-safe summaries. The raw Google SDK handles Computer Use since Vercel AI SDK doesn't support it yet." |
| "How do you make money?" | "SaaS — per analysis or monthly subscription. Every product team is a customer." |
| "What's next?" | "Scheduled runs, CI/CD integration, regression testing between deploys." |

---

*Built at Cerebral Valley × Vercel × DeepMind Hackathon NYC 2026*
