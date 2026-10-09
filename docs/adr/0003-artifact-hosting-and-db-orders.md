# ADR-0003: Artifact hosting, DB-backed orders and fallback

**Status:** Accepted
**Date:** 2026-10-09

## Context
The owner wants a live URL on Claude's domain and to receive orders. There is no server. The Artifact runtime offers
a per-artifact database with sharing-level rules and viewer identity. Visitors from outside the owner's
organisation on a public link hold `view` level and cannot write; signed-out visitors have no DB.

## Decision
Publish to a claude.ai Artifact. Save orders to `orders/<viewer id>/items/<code>` with rules that let each customer
write only their own subtree and only the owner read across customers. Keep the spot price in `config/spot`
(owner-written, world-readable). When a save is impossible, complete the order in the UI and give the customer the
order code, a copyable summary and the concierge address.

## Options considered
| Option | Pros | Cons |
|---|---|---|
| **Artifact DB + fallback (chosen)** | zero infrastructure; owner ledger in-page | public visitors can't write |
| External form/backend | everyone can submit | CSP blocks requests to other hosts |
| `mailto:` checkout | simple | unreliable inside the Artifact frame |

## Consequences
- To accept orders from everyone automatically, give visitors Contributor access (organisation sharing) or move
  to a host with a backend.
- No card payments on the site; payment is arranged after confirmation (stated at checkout).
- The owner sees orders at `#ledger`; Claude can read them with ArtifactData.
