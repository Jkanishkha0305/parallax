# ⚡ Parallax

<p align="center">
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AI%20SDK-000000?style=for-the-badge&logo=AI&logoColor=white" alt="AI SDK" />
</p>

<p align="center">
  <strong>AI Persona Agents That Navigate Your Product & Report Real Friction</strong>
</p>

<p align="center">
  🎯 <a href="https://parallax.demo">Live Demo</a> • 📖 <a href="#problem-statement">Problem</a> • 🏗️ <a href="#architecture">Architecture</a> • 🚀 <a href="#getting-started">Get Started</a>
</p>

---

## 🎯 The Problem

Every product team needs user feedback. But traditional UX research is:

| Traditional Approach | Cost | Time | Scale |
|---------------------|------|------|-------|
| User interviews | $5K-50K | 2-4 weeks | 5-10 users |
| Surveys | $1K-10K | 1-2 weeks | 100+ users |
| Analytics tools | $500+/mo | Ongoing | Thousands |

**What if 5 AI personas could navigate your site RIGHT NOW and tell you what's broken?**

---

## ✨ What is Parallax?

Parallax is an **autonomous UX testing agent** that:

1. 🤖 **Launches 5 AI personas** simultaneously to navigate any website
2. 👁️ **Uses Gemini Computer Vision** to see and understand the UI
3. 🎭 **Thinks like real users** — from impatient power users to accessibility-conscious visitors
4. 📊 **Scores UX quality** and provides specific, actionable feedback
5. 💡 **Suggests fixes** using AI-powered recommendations

### Why It's Different

| Feature | Parallax | Traditional Tools | Hotjar/FullStory |
|---------|----------|-------------------|------------------|
| **Autonomous Navigation** | ✅ Yes | ❌ No | ❌ No |
| **Multi-Persona Testing** | ✅ 5 at once | ❌ Manual | ❌ Manual |
| **AI-Powered Analysis** | ✅ Gemini Vision | ❌ No | ❌ No |
| **Instant Results** | ✅ <60 seconds | ❌ Days | ❌ Hours |
| **Cost** | $0* | $5K+ | $500+/mo |

*GPU costs apply for Gemini API

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 FRONTEND                                     │
│                              Next.js 16 + React                             │
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                   │
│  │  URL Input   │   │   Persona    │   │   Results    │                   │
│  │  Component   │   │   Picker     │   │   Dashboard  │                   │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                   │
│         │                    │                   │                           │
│         └────────────────────┼───────────────────┘                           │
│                              │                                               │
│                        ┌─────▼─────┐                                        │
│                        │   API     │                                        │
│                        │  Routes   │                                        │
│                        │ (SSE)     │                                        │
│                        └─────┬─────┘                                        │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │ POST /api/analyze
                               │ (Server-Sent Events Stream)
┌──────────────────────────────┼───────────────────────────────────────────────┐
│                              │              BACKEND                         │
│                    ┌─────────▼──────────┐                                   │
│                    │  /api/analyze      │                                   │
│                    │  Route Handler     │                                   │
│                    └─────────┬──────────┘                                   │
│                              │                                              │
│         ┌────────────────────┼────────────────────┐                         │
│         │                    │                    │                        │
│   ┌─────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐               │
│   │  Launch   │      │    Agent     │     │   Gemini    │               │
│   │  Browser  │─────▶│    Loop      │────▶│   Computer  │               │
│   │ (Playwright)     │              │     │   Use API   │               │
│   └────────────┘      └──────┬──────┘     └─────────────┘               │
│                              │                                              │
│              ┌───────────────┼───────────────┐                             │
│              │               │               │                             │
│       ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐                     │
│       │  Screenshot │ │  Execute   │ │  Generate   │                     │
│       │   Capture   │ │   Action   │ │   Summary   │                     │
│       └─────────────┘ └───────────┘ └──────────────┘                     │
│                                                                             │
│   /api/suggestions ──────────────────────────────────────────────────       │
│   Uses Gemini Flash to generate actionable UX recommendations              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌─────────┐
│  User   │───▶│  Enter   │───▶│  Launch    │───▶│  Agents  │───▶│  Live   │
│         │    │   URL    │    │  5 Browser │    │  Navigate│    │  Score  │
└─────────┘    └──────────┘    │  Sessions   │    └──────────┘    └─────────┘
                               └─────────────┘
```

---

## 🎭 The 5 AI Personas

| Persona | Description | What They Find |
|---------|-------------|----------------|
| 🏃 **Speedrun Steve** | Power user who wants minimum clicks | Unnecessary friction, slow paths |
| 😕 **Confused Clara** | First-time user who finds tech confusing | Unclear labels, missing help |
| 🔒 **Skeptical Sam** | Privacy-conscious questioner | Data collection concerns, dark patterns |
| ♿ **Accessible Alex** | Keyboard-only & screen reader user | A11y issues, tab order problems |
| 🌍 **Global Gita** | Non-English speaker from India | Internationalization gaps |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Google Gemini API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/parallax.git
cd parallax

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
```

### Development

```bash
# Run the development server
npm run dev

# Open http://localhost:3000
```

### Deployment

```bash
# Deploy to Vercel (recommended)
npx vercel deploy

# Or build for production
npm run build
npm start
```

---

## 📁 Project Structure

```
parallax/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/          # Core agent API (SSE)
│   │   │   ├── suggestions/      # AI suggestions API
│   │   │   └── generate-personas/ # Custom persona generator
│   │   ├── page.tsx              # Landing page
│   │   └── results/              # Results dashboard
│   ├── components/
│   │   ├── url-input.tsx         # URL input component
│   │   ├── persona-picker.tsx    # Persona selection grid
│   │   ├── journey-card.tsx      # Streaming journey display
│   │   └── parallax-score.tsx    # Score visualization
│   └── lib/
│       ├── agent-loop.ts          # Core agent logic
│       ├── browser.ts            # Playwright browser control
│       ├── personas.ts           # Persona definitions
│       └── types.ts              # TypeScript types
├── public/
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4 |
| **AI Engine** | Google Gemini 2.5 (Computer Use + Flash) |
| **AI SDK** | Vercel AI SDK (generateObject, generateText) |
| **Browser** | Playwright (headless Chromium) |
| **Deployment** | Vercel (Serverless Functions) |
| **Validation** | Zod |

---

## 📊 Judging Criteria Alignment

| Criteria | How We Meet It |
|----------|----------------|
| **Live Demo (45%)** | Judges can paste ANY URL and watch 5 agents navigate live in 60 seconds |
| **Creativity (35%)** | First-of-its-kind autonomous UX testing with multi-persona simulation |
| **Impact (20%)** | Every product team needs this — real B2B value, scales to thousands of sites |

---

## 🎬 Demo Script

```
[0:00-0:20] HOOK
"Every product team needs user feedback. But real user testing
takes weeks and costs thousands. What if 5 AI personas could
navigate your site RIGHT NOW and tell you what's broken?"

[0:20-1:30] LIVE DEMO
- Paste a URL (the judge's site or well-known site)
- 5 persona cards appear, start navigating simultaneously
- Show screenshots streaming in with observations
- "Steve says signup takes 7 clicks — he wants a shortcut"
- "Clara can't find the pricing page"
- "Sam doesn't trust the cookie banner"

[1:30-2:20] SHOW RESULTS
- Overall Parallax Score: 6.2/10
- Click into one persona's full journey
- Show screenshot at each step with thought bubbles
- Show pain points summary
- Click "AI Suggestions" for actionable fixes

[2:20-3:00] CLOSE
- "Built with Vercel AI SDK + Gemini 2.5 Computer Use"
- "Each persona actually navigates your site — this isn't
  static analysis, these are real agent journeys"
- "Point it at any URL. Know your blind spots in 60 seconds."
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built at Cerebral Valley x Vercel x DeepMind Hackathon NYC 🎯</strong>
</p>
