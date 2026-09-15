export const posts = [
  {
    slug: "building-a-digital-presence",
    title: "Building a digital presence",
    date: "2026-09-16",
    summary: "Notes on making a personal homepage feel alive without rebuilding every collector, API and renderer from scratch.",
    tags: ["web", "presence", "design"],
    published: false,
    body: `# Building a digital presence

This site is designed around one rule: **the page should feel like a place, not a dashboard**.

The visual layer is custom, but the plumbing should use mature tools whenever possible. Discord presence comes from Lanyard, software activity comes from ActivityWatch, keyboard statistics come from WhatPulse, fitness data comes from Health Auto Export, and photo layout comes from React Photo Album.

The interesting part is not rebuilding those collectors. It is deciding what deserves to be visible, how much context to reveal, and how all of it should fit together without turning the page into an admin panel.

## Current structure

- Home — a live overview
- Photo — VRChat screenshots and visual memories
- Blog — longer notes
- Uses — the software I actually use

This post is a draft and is intentionally not published yet.`
  }
];
