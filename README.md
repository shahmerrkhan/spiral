# Spiral

**Goal tracking for messy people.**

Set one ridiculous 6-month goal. Log what actually happens every week — the good weeks, the bad ones, the ones where you barely showed up. No streaks. No guilt. Just evidence.

Live: [spiral-lime.vercel.app](https://spiral-lime.vercel.app)

---

## What it does

Spiral breaks a 6-month goal into monthly milestones and weekly actions. Every week you write what happened and rate your effort 1–10. The app tracks your pattern over time — consistency, momentum, missed weeks — and generates a Spiral Energy score and a visual DNA fingerprint unique to your logged data.

### Core features

- **Weekly check-ins** — one log per week, effort score 1–10, enforced once per week
- **Spiral Energy** — a 0–100 score calculated from consistency, effort, and recency
- **Spiral DNA** — a generative SVG fingerprint built from your actual weekly scores
- **AI Coach** — asks the uncomfortable questions, reads your pattern, keeps it real
- **Wreckage Playback** — animated canvas that replays your spiral week by week
- **Replay Mode** — watch your full story play back chronologically
- **Spiral Battles** — challenge someone to chase the same goal; one log per week each, real-time leaderboard, six months, one winner
- **Public Spiral Wall** — share your spiral as a public link; all shared spirals appear on `/spirals`
- **Stats page** — effort over time chart, weekly consistency bars, monthly breakdown
- **Chaos Mode** — a neon theme for when dark mode isn't enough

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend | Express.js, Node.js |
| Database | Neon (serverless PostgreSQL) |
| Auth | Supabase Auth |
| Deployment | Vercel (frontend), Railway (backend) |
| Fonts | Syne, DM Sans |

---

## Project structure
Spiral/
├── frontend/          # Next.js app
│   ├── app/           # Pages (dashboard, battles, replay, stats, etc.)
│   ├── components/    # Shared components
│   └── lib/           # API client, Supabase helpers
└── backend/           # Express API
└── src/
├── index.js       # Server entry point
├── routes/
│   └── battles.js # Battles, shares, public spirals endpoints
└── lib/
└── schema.js  # Drizzle schema
---

## Running locally

### Prerequisites
- Node.js 18+
- A Neon database
- A Supabase project (for auth)

### Backend

```bash
cd backend
npm install
# create .env with DATABASE_URL=your_neon_connection_string
node src/index.js
```

### Frontend

```bash
cd frontend
npm install
# create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
npm run dev
```

---

## API routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/battles` | Create a new battle |
| GET | `/api/battles/:id` | Get battle details |
| POST | `/api/battles/:id/log` | Log a week for a battle |
| GET | `/api/battles/user/:userId` | Get all battles for a user |
| GET | `/api/users/lookup` | Look up a user by email |
| POST | `/api/shares` | Save a spiral snapshot |
| GET | `/api/shares/:id` | Get a shared spiral |
| GET | `/api/spirals/public` | Get all public spirals |
| POST | `/api/coach` | Send a message to the AI coach |

---

## Built during FlowHouse Cohort 1 by PrettiFlow

Spiral was started from scratch during the one-week FlowHouse builder program. The core tracker was built in the first night. Spiral Battles, the public wall, the animated landing page, and the full mobile navigation were all shipped during the cohort week.

---

## Author

**Muhammad Shahmeer Khan** — Grade 11, Cambridge Ontario  
[LinkedIn](https://linkedin.com/in/shahmerrkhann) · [GitHub](https://github.com/shahmerrkhan)