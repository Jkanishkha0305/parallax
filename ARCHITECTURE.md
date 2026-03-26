# Architecture — parallax

> 🏅 EmpireHack '26 Finalist
> Live: https://parallax-ten-rho.vercel.app

## How It Works

Parallax deploys 5 AI personas — each with distinct emotional profiles, backgrounds, and usage patterns — to test your product and report issues just like real users would.

```
  Your Product URL
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │              Parallax Engine                │
  │                                             │
  │  Persona 1: "The Power User"                │
  │  → Explores edge cases, advanced features  │
  │                                             │
  │  Persona 2: "The Casual Browser"            │
  │  → Tests onboarding, first impressions      │
  │                                             │
  │  Persona 3: "The Frustrated Customer"       │
  │  → Tests error states, UX friction points  │
  │                                             │
  │  Persona 4: "The Accessibility User"        │
  │  → Screen reader, keyboard nav, contrast   │
  │                                             │
  │  Persona 5: "The Mobile Skimmer"            │
  │  → Mobile UX, responsive design, speed     │
  └─────────────────────────────────────────────┘
       │
       ▼
  Aggregated Report
  • Issues ranked by severity
  • Persona-specific insights
  • Emotion + confidence scores
  • Actionable fix suggestions
```

## Usage

**Web UI**: Visit [parallax-ten-rho.vercel.app](https://parallax-ten-rho.vercel.app), paste your product URL
**Slack Bot**: `/parallax test https://yourproduct.com`
