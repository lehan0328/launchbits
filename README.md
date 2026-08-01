<div align="center">

# 🚀 Launchbits

**Cross-functional feature launch governance for modern engineering teams.**

Connect code changes to mandatory privacy, security, and legal sign-offs before anything ships.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-4F46E5)](LICENSE)

</div>

---

## The Problem

Every company shipping software faces the same challenge: **how do you ensure that features go through the right compliance reviews before they reach production?**

Privacy reviews, security audits, legal sign-offs — these aren't optional. But tracking them across Slack threads, spreadsheets, and email chains doesn't scale.

## The Solution

Launchbits is a structured launch governance platform that:

- **Automates review routing** — A risk questionnaire determines which reviews are required (privacy, security, legal, eng lead) based on what data you touch, what APIs you expose, and who your users are.
- **Calculates risk levels** — Answers flow through a rules engine that assigns LOW / MEDIUM / HIGH risk and adjusts review requirements accordingly.
- **Tracks SLO compliance** — Every review has a deadline. Breaches are surfaced, not buried.
- **Provides audit trails** — Every status change, approval, and exception is logged with timestamps and actors.

> Inspired by Google's internal launch governance tools (Ariane/Launch), rebuilt as an open platform.

---

## Features

| Feature | Description |
|---|---|
| **Risk Questionnaire** | 6-section questionnaire covering data classification, processing purpose, retention, sharing, AI/ML governance, and security architecture |
| **Policy Rules Engine** | Configurable rules that map questionnaire answers → required review types with risk-level overrides |
| **Risk Calculator** | Automated LOW/MEDIUM/HIGH classification with hard overrides for COPPA, automated decisions, etc. |
| **Review Tracking** | Per-review status tracking with SLO timers, breach detection, and reviewer attribution |
| **Launch Detail View** | Full launch card with review progress, readiness banner, questionnaire summary, and activity log |
| **Dashboard** | "Owned by you" and "Pending your approval" views with sortable, selectable data tables |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript 5 (strict mode) |
| **Styling** | Vanilla CSS with design token system |
| **Data** | In-memory store (MVP) — designed for Supabase/PostgreSQL migration |
| **Fonts** | Inter (UI) + Roboto Mono (code/IDs) |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (TopBar + Sidebar shell)
│   ├── page.tsx                  # Dashboard
│   ├── error.tsx                 # Error boundary
│   ├── not-found.tsx             # 404 page
│   ├── loading.tsx               # Loading skeleton
│   ├── globals.css               # Design system (tokens → utilities → components)
│   ├── owned/page.tsx            # "Owned by you" table view
│   ├── reviews/page.tsx          # "Pending your approval" table view
│   └── launches/
│       ├── new/page.tsx          # Create launch (questionnaire + risk preview)
│       └── [id]/page.tsx         # Launch detail (reviews, activity, sidebar)
├── components/                   # Reusable UI
│   ├── DataTable.tsx             # Generic table (ColumnDef, toolbar, sections)
│   ├── Sidebar.tsx               # App navigation
│   └── TopBar.tsx                # Global header
├── contexts/                     # React contexts
│   └── SidebarContext.tsx        # Sidebar collapse/expand
└── lib/                          # Pure logic & data
    ├── types.ts                  # All TypeScript interfaces
    ├── store.ts                  # In-memory data store
    ├── utils.ts                  # Formatting & status helpers
    ├── labels.ts                 # Display label maps
    ├── columns.tsx               # Shared table column definitions
    ├── questionnaire.ts          # Questionnaire configuration
    ├── risk-calculator.ts        # Risk level computation
    └── rules-engine.ts           # Policy rules → required reviews
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/lehan0328/launchbits.git
cd launchbits
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

---

## How It Works

### 1. Create a Launch Card

Navigate to **Create Launch** and fill out the questionnaire:
- What data does your feature process?
- Who are your target users?
- What APIs are you exposing?
- How long do you retain data?

### 2. Risk Assessment

As you answer questions, the risk calculator runs in real-time:
- **LOW** → Minimal reviews (mostly FYI)
- **MEDIUM** → Standard review cycle
- **HIGH** → Mandatory blocking reviews with restricted access

### 3. Automated Review Routing

The rules engine evaluates your answers and determines which reviews are required:

| Trigger | Review |
|---|---|
| Processes user data | Privacy Review |
| Exposes public API or handles credentials | Security Review |
| Cross-border transfers or monetization | Legal Review |
| Always | Engineering Lead Approval |

### 4. Track & Ship

Reviews are tracked with SLO timers. Once all blocking reviews are approved, the launch is cleared for production.

---

## Architecture

```
Questionnaire Answers
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│ Risk Calculator  │────▶│  Rules Engine     │
│ (max weight →    │     │ (conditions →     │
│  LOW/MED/HIGH)   │     │  required reviews)│
└─────────────────┘     └──────────────────┘
                                │
                                ▼
                    ┌──────────────────┐
                    │  Review Tracking  │
                    │  (SLO timers,     │
                    │   status, audit)  │
                    └──────────────────┘
```

---

## Roadmap

- [ ] **Backend**: PostgreSQL/Supabase migration with real API routes
- [ ] **Auth**: OAuth 2.0 / SSO integration
- [ ] **Notifications**: Slack webhook integration for review assignments and SLO warnings
- [ ] **GitHub Integration**: Auto-create launch cards from PRs, block merges pending reviews
- [ ] **YAML Policy Config**: Define org-specific review rules in version-controlled YAML
- [ ] **Dark Mode**: Design token system already supports it

---

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT © [Lehan Ouyang](https://github.com/lehan0328)
