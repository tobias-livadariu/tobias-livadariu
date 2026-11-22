# AI Model Workflow for a Playable Game on a GitHub Profile

## Context

I have two subscriptions:

- **ChatGPT Plus:** approximately US$20/month
- **Claude Pro:** approximately US$20/month

The goal is to experiment with embedding or approximating a **playable, recognizable video game within a GitHub profile README**, despite GitHub's restrictions on executable content.

> **Note:** Model names, availability, subscription limits, and relative performance can change. Verify the current model menu and plan allowances before relying on a specific model.

## Recommended model selection

| Model | Best use in this project | Role |
|---|---|---|
| **GPT-6.2 Astra** | Unusual architectural constraints, feasibility analysis, difficult debugging | Primary reasoning / architecture model |
| **GPT-6.2 Sol** | Everyday programming questions, small features, routine fixes | Day-to-day ChatGPT model |
| **Claude Opus 5.5** | Independent architectural critique, alternate approaches, challenging bugs | Second expert opinion |
| **Claude Sonnet 5.5** | Implementation, tests, refactoring, well-scoped coding | Day-to-day Claude model |

These are **suggested roles**, not guarantees that one model will outperform another on every task.

## Suggested workflow

### 1. Design with GPT-6.2 Astra

Investigate GitHub profile README limitations and brainstorm solutions using Markdown, linked pages, generated assets, and optionally GitHub Actions. Decide what “playable on the profile” must mean.

**Questions to answer:**
- Can the game be played entirely inside the README, or will users navigate to linked Markdown files?
- Can interaction be implemented with hyperlinks and precomputed states?
- How many states, images, and files would the chosen game require?
- Can a smaller proof-of-concept be built first?

### 2. Critique with Claude Opus 5.5

Give Opus the proposed architecture, constraints, and failure cases. Ask it to challenge assumptions, identify hidden GitHub restrictions, estimate complexity, and propose simpler alternatives.

**Useful prompt:**

> Review this proposal as a skeptical senior engineer. Identify technical flaws and GitHub README limitations, rank risks by severity, and propose a smaller proof-of-concept. Do not assume that JavaScript, WebAssembly, or iframes execute in a GitHub README.

### 3. Implement with Claude Sonnet 5.5 or GPT-6.2 Sol

Use these for ordinary implementation work:

- Generating Markdown pages and game-state assets
- Writing scripts to enumerate transitions
- Building test fixtures and validators
- Refactoring and reviewing incremental code changes
- Fixing straightforward bugs

For repository-level editing, **Claude Code** and **Codex** may be more convenient than copying code between chat windows. Keep work in Git commits or branches, and avoid having two agents edit the same files at the same time.

### 4. Escalate difficult issues to Astra or Opus

Return to the stronger reasoning models when:

- A fundamental assumption about Markdown or GitHub turns out to be wrong
- The game state space becomes too large
- An unexpected interaction or rendering limitation appears
- You need to redesign the architecture
- Ordinary debugging fails to find the root cause

## Why the GitHub environment matters

GitHub README rendering generally **does not permit arbitrary JavaScript, WebAssembly, or embedded iframes**. Therefore, a conventional browser game cannot simply run inline in the profile README.

Potential approaches:

| Approach | Works directly inside a README? | Interactivity | Complexity |
|---|---|---|---|
| Animated GIF or image | Yes | No | Low |
| Links between Markdown game states | Markdown-based navigation, potentially across files | Clickable navigation | Medium to high |
| Pre-rendered DOOM-style experience | Linked pages and screenshots | Precomputed navigation | Very high |
| Game hosted on GitHub Pages | No; opens as a separate page | Full browser-game interaction | Medium |

An example of the pre-rendered approach is Kuber Mehta's DOOM-in-a-GitHub-README project:

- [How I Made DOOM Run Inside a GitHub README](https://kuber.studio/blog/Projects/How-I-Made-DOOM-Run-Inside-a-GitHub-Readme)

This is **not equivalent to running the original game engine inside GitHub**. It creates a navigable approximation using linked states and images.

## Usage-limit strategy for $20 subscriptions

Use the strongest models selectively rather than for every prompt.

- **Approximately 15–25% of tasks:** Astra / Opus for architectural decisions and hard blockers.
- **Remaining tasks:** Sol / Sonnet for implementation and iteration.

These percentages are a *workflow suggestion*, not measured quotas. Actual usage is affected by conversation length, model choice, tool use, and plan restrictions. Claude Pro's Claude Code usage may share subscription limits with Claude chat; confirm current allowances in the provider interface.

## Recommended next steps

1. Define the interaction requirement: **fully on the profile page**, **linked Markdown navigation**, or **click-through to GitHub Pages**.
2. Select a small game to prototype, perhaps a short retro dungeon crawler rather than a complete commercial title.
3. Ask Astra to produce an architecture and minimal proof-of-concept plan.
4. Ask Opus to critique the plan.
5. Build the smallest playable slice with Sonnet or Sol using a Git repository.
6. Test the actual GitHub rendering, then scale up only if the interaction works.

## Bottom line

**Use Astra to design, Opus to challenge, and Sol/Sonnet to build.** Prefer Code-oriented tools for repository changes and preserve a clear handoff document when switching between providers. Stick with the two $20 plans until actual usage limits justify a change.
