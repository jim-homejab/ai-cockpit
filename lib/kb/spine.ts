import type { AreaInput } from "./store";

// The recommended default PKB structure: a domain-first spine the user applies
// in one click, then grows over time. Generic by design — the Phase 6
// onboarding concierge personalizes it (renames "Work" to the user's actual
// companies/projects, seeds topics) from what it learns in the interview.
//
// Areas are typed: most are topic buckets for facts, but "Instructions" is the
// home for standing rules and "People" is the home for contacts. Type drives
// display; behavior comes from the records themselves.

const WORK_TOPICS = [
  "Company Overview",
  "Team",
  "Product",
  "Marketing",
  "Roadmap",
  "Work in Progress",
  "Performance Metrics",
  "Ongoing Discussions",
];

export const RECOMMENDED_SPINE: AreaInput[] = [
  {
    name: "About Me",
    icon: "👤",
    description: "Who you are — your goals, preferences, and working style.",
    locked: true,
    sort: 0,
    kind: "fact",
    topics: ["Bio", "Goals", "Preferences", "Working Style"],
  },
  {
    name: "Instructions",
    icon: "📜",
    description: "Standing rules that guide how Chief reads and acts for you.",
    locked: true,
    sort: 1,
    kind: "instruction",
    topics: [],
  },
  {
    name: "Work",
    icon: "🏢",
    description: "Everything about your company and what you're building.",
    locked: true,
    sort: 2,
    kind: "fact",
    topics: WORK_TOPICS,
  },
  {
    name: "People",
    icon: "👥",
    description: "The people you work with day to day.",
    locked: true,
    sort: 3,
    kind: "contact",
    topics: [],
  },
];
