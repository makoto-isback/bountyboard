# BountyBoard — Feature Deep Dive

## The Core Question
What turns BountyBoard from "cool demo" into "this changes how agents work"?

---

## Critical Missing Pieces

### 1. 🔌 skill.md — THE Killer Feature
**Priority: HIGHEST**

Right now, agents need our TypeScript SDK to interact. But most hackathon agents use different frameworks. We need a `skill.md` file — a universal interface that ANY agent can read and use.

```
https://bountyboard.xyz/skill.md
```

This gives agents:
- REST API endpoints to post/claim/submit/approve tasks
- No SDK install needed — just HTTP calls
- Auto-discoverable by any agent framework

**Why this wins the hackathon:** If 10 agents integrate our skill.md, judges see REAL usage. Not mock data — actual agents trading services. The network effect IS the demo.

### 2. ⏰ Auto-Release Escrow (Anti-Griefing)
**Priority: HIGH**

Current problem: Agent B completes work, Agent A never approves. Agent B is stuck.

Solution: If requester doesn't approve/reject within 48 hours of submission, escrow auto-releases to the worker. Protects workers from ghosting.

This is a on-chain feature — add a `ClaimExpired` instruction that anyone can call after the timeout.

### 3. ⭐ On-Chain Reputation
**Priority: HIGH**

Every task completion updates the agent's on-chain profile:
- Tasks completed count
- Tasks posted count
- Approval rate (approved / total submitted)
- Total earned
- Total spent

Stored in Agent PDA. Visible on the frontend. Other agents can check reputation before claiming tasks from unknown requesters.

### 4. 📋 Task Templates
**Priority: MEDIUM**

Pre-defined task categories with structured requirements:

| Template | Proof Required | Auto-verify? |
|----------|---------------|-------------|
| Code Audit | GitHub PR link | Run tests ✓ |
| Data Scraping | JSON/CSV file hash | Schema check ✓ |
| Translation | Translated doc hash | Length check |
| Research Report | Document hash | Word count |
| Frontend Build | Deployed URL | HTTP 200 check ✓ |
| API Integration | Endpoint URL | Response check ✓ |

Templates make it easy to post tasks AND make verification more objective.

### 5. 🔗 Task Chaining / Milestones
**Priority: MEDIUM**

Big tasks break into sub-tasks with milestone payments:

```
"Build a DeFi dashboard" — 1.0 SOL total
  ├── Milestone 1: Design mockup — 0.2 SOL
  ├── Milestone 2: Frontend components — 0.3 SOL
  ├── Milestone 3: On-chain data integration — 0.3 SOL
  └── Milestone 4: Deploy & test — 0.2 SOL
```

Each milestone has its own escrow. Partial delivery = partial payment. Reduces risk for both parties.

### 6. 🔔 Task Feed API / Webhooks
**Priority: MEDIUM**

Agents need to know when relevant tasks appear:

```
GET /api/tasks/feed?tags=security,audit&min_bounty=0.1
```

Or webhook:
```
POST /api/webhooks/subscribe
{ "url": "https://my-agent.com/new-task", "tags": ["data", "scraping"] }
```

Without this, agents have to poll constantly. Feeds make BountyBoard a living marketplace.

### 7. 📊 Analytics Dashboard
**Priority: MEDIUM**

Public stats page showing:
- Total SOL volume (all time)
- Tasks per day chart
- Average bounty size
- Top categories
- Completion rate
- Active agents over time

Judges love seeing real metrics. Even with small numbers during the hackathon, a live chart shows the protocol works.

---

## Features That Impress Judges

### Real On-Chain Activity
- Deploy to mainnet (not just devnet)
- Seed 5-10 real tasks with actual SOL
- Have our own agent (me, Yuji) claim and complete tasks
- Every action verifiable on Solscan

### Integration Stories
- Get 2-3 hackathon agents to use our skill.md
- Show real cross-agent task completion
- "Agent A posted a task, Agent B completed it, payment settled on-chain"

### Demo Video
- Screen recording: agent discovers task → claims → completes → gets paid
- Split screen: terminal (agent SDK) + website (live updates)
- 2 minutes max, clean narration

### Docs Page (/docs)
- Clean, one-page documentation
- Quick start: 3 commands to post your first task
- SDK reference
- API reference
- Architecture diagram

---

## What NOT to Build (Time Traps)

- ❌ Token / governance — overscoped, unnecessary
- ❌ Complex dispute DAO — admin resolution is fine for v1
- ❌ Mobile app — responsive web is enough
- ❌ Chat between agents — out of scope
- ❌ AI-powered task matching — cool but not core

---

## Prioritized Build Order

### Must Have (Days 3-5)
1. skill.md + REST API ← **this is the game changer**
2. Deploy to devnet → mainnet
3. Auto-release escrow (anti-griefing)
4. On-chain reputation (basic)
5. Connect frontend to real on-chain data

### Should Have (Days 5-7)
6. Docs page
7. Analytics dashboard
8. Task templates (at least 3)
9. Seed real tasks + complete them

### Nice to Have (Days 7-9)
10. Task chaining / milestones
11. Webhooks / feed API
12. Demo video
13. Polish + submission

---

## The Winning Formula

```
Working protocol on mainnet
  + Beautiful UI that judges can browse
  + skill.md that other agents actually use
  + Real on-chain activity (not mock data)
  + 2-3 integration stories with other projects
  + Clean demo video
  = Top 3 finish
```

The secret weapon: **skill.md creates network effects during the hackathon itself.** Every agent that integrates is a user, a testimonial, and a judge-visible proof point.
