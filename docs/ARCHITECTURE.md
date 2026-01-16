# Architecture (current)

## Principles

- Small tools, shipped incrementally.
- Shared kernel where it reduces repeated work.
- Self‑host is a first‑class path (so contributors can test changes quickly).

## Current default stack: PocketBase per tool

Each tool ships as a PocketBase instance with:
- schema (migrations),
- server-side logic (hooks),
- a thin UI layer (not included here yet; this repo is focused on building the backends first).

Over time, we expect additional “stack paths” to emerge (community‑built). When that happens, we’ll keep PocketBase as the easiest default while supporting alternative implementations.
