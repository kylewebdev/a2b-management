# Project Overview — Estate Liquidation Appraisal Co-Pilot

---

## Purpose

This project is an **AI-powered onsite appraisal co-pilot** built for estate liquidation work. The operator sends photos of items found during estate cleanouts, and the AI rapidly identifies, classifies, values, and routes each item through the correct disposition path. Every response is optimized for speed and accuracy under real-world field conditions.

---

## Core Mission

**Move fast without leaving money on the table.**

The two most expensive mistakes in estate sale work are:

1. **Wasting time on junk** — over-researching low-value items that should be bulked, donated, or trashed.
2. **Underpricing something valuable** — letting a sleeper item walk out the door at garage sale prices when it should be researched, listed individually, or routed to a specialist.

This co-pilot exists to eliminate both failure modes on every single item.

---

## Estate & Location Management

Before any items are processed, the operator creates an **estate** in the system. Each estate represents a single job site — one property, one cleanout.

### Creating an Estate
- An estate is created by providing a **location or address** (e.g., "1423 Oak St, Springfield, IL").
- Each estate gets a unique identifier and serves as the container for all items found at that property.
- Optional metadata can be attached: client name, job date, access notes, or any other context the operator finds useful.

### Photo Association
- When the operator uploads photos, they select or confirm which estate the photos belong to.
- Every item photo is permanently linked to its estate, so triage results, valuations, and disposition records are organized by property.
- This makes it possible to review, report on, and close out each estate independently.

### Estate Lifecycle
| Status | Meaning |
|--------|---------|
| **Active** | Currently being worked — items are being photographed, triaged, and routed onsite. |
| **Resolving** | Onsite work is complete, but items are still being listed, sold, or awaiting final disposition. |
| **Closed** | All items have reached final disposition. The estate is archived for records. |

An estate moves to **Closed** when every item has reached its final outcome in Stage 4 (Resolve). This can be triggered manually by the operator or flagged automatically when no items remain in an open status.

The operator can have multiple estates active at once. The system keeps each estate's inventory, triage history, and financials separate.

### Estate Editing & Item Reassignment
- The operator can edit estate details (address, client name, notes) at any time before the estate is closed.
- If a photo or item was associated with the wrong estate, the operator can reassign it to the correct one. Triage results and disposition records move with the item.
- Merging two estates into one is supported for cases where the same property was accidentally entered twice.

### Estate-Level Reporting
Each estate maintains a running summary that the operator can review at any time:
- **Item count by tier** — how many items landed in each tier (1–4)
- **Disposition status** — how many items are triaged, in progress, and fully resolved
- **Estimated total value** — aggregate of all item value estimates, broken out by tier
- **Revenue tracking** — actual sold prices as items are resolved, compared against estimates
- **Unresolved items** — a list of items still awaiting final disposition, with their current status

This gives the operator a clear picture of where each estate stands and what still needs attention.

---

## The Intake Pipeline

Every item in an estate moves through a single, repeatable pipeline. The goal is maximum throughput with minimum missed value. The pipeline has four stages:

### Stage 1 — Capture
The field operator photographs the item using the standardized photo method (see Field Guide). Photos are submitted to the AI co-pilot individually or in small batches, and are **associated with the active estate** at the time of upload. Speed is prioritized — a good-enough photo now beats a perfect photo later.

### Stage 2 — Triage
The AI receives the photos and immediately returns triage results. The selected estate serves as the **organizational container** — it determines where the item is filed and reported, but does not influence the AI's identification or valuation logic. The AI returns:
- **Identification** — what it is, who made it, approximate era
- **Tier classification** — which action track the item belongs on
- **Confidence level** — whether the AI can make the call from what it sees or needs more

This stage should take seconds per item. The majority of estate contents are Tier 1 or Tier 2 and get resolved here permanently.

### Stage 3 — Route
Based on the tier classification, the item moves to its correct track:

| Tier | Label | Route | Next Action |
|------|-------|-------|-------------|
| 1 | **Bulk / Donate / Trash** | Stay in place or move to staging area | Tag and move on. No further attention. |
| 2 | **Quick Flip / Garage Sale** | Price and tag onsite | Operator applies price tag using AI estimate. Done. |
| 3 | **Research & List** | Pull to research staging area | Operator takes full photo set, AI provides comps and listing guidance. Item gets listed on appropriate platform. |
| 4 | **High Value / Specialist** | Pull and secure separately | AI flags for deeper research, authentication, specialist referral, or auction consignment. Operator secures item and documents thoroughly. |

### Stage 4 — Resolve
Each item reaches its final outcome:
- **Tier 1** → Bulk lot, donation bin, or disposal
- **Tier 2** → Sold onsite at estate sale or quick-listed online
- **Tier 3** → Individually listed and sold on eBay, Mercari, Facebook Marketplace, or niche platform
- **Tier 4** → Consigned to auction, sold through specialist dealer, or professionally appraised

The pipeline is linear and final. Items move forward, not backward. Once triaged, an item does not get re-evaluated unless new information surfaces (like finding a hidden signature or mark during cleaning).

When all items in an estate have reached their final outcome in Stage 4, the estate is eligible to move to **Closed** status (see Estate Lifecycle).

---

## Batch Processing Strategy

Estates contain hundreds to thousands of items. Processing them one at a time is not realistic. The pipeline supports batch workflows:

### Room-by-Room Sweep
The operator works through the estate one room at a time, photographing and submitting items in rapid succession. The AI returns triage calls in the same order. The operator can tag, pull, or skip items as responses come back.

### Category Batching
For rooms with heavy concentrations of similar items (a china cabinet, a bookshelf, a tool bench), the operator can photograph groups and ask for batch triage. The AI will identify and classify each visible item and call out any sleepers in the group.

### Bulk Dismissal
When an entire shelf, drawer, or box is clearly low-value commodity goods (common kitchenware, basic office supplies, worn linens, mass-market paperbacks), the operator can send a single wide shot and ask for a bulk call. The AI will confirm the bulk dismissal or flag any individual items worth pulling.

All batch submissions — room sweeps, category batches, and bulk dismissals — inherit the active estate association. Every item in the batch is filed under the same estate.

---

## How the AI Responds

For every item or batch submitted, the AI delivers:

1. **Estate Context** — The response header identifies which estate the item belongs to (name and address), so operators working across multiple active estates can immediately confirm they're looking at the right property.

2. **Identification** — What is it? Brand, maker, era, material, style, pattern name, model number, or any other defining attributes visible from the photos.

3. **Tier Classification** — Sorted into the appropriate action tier (1–4) with clear rationale.

4. **Estimated Value Range** — A realistic sold-price range based on comparable market data, not aspirational asking prices. The range accounts for condition, completeness, and current demand.

5. **Comparable Sales Data** — Reference to relevant eBay sold listings, auction results, or other market comps that justify the estimate. Includes approximate sold prices, dates when possible, and notes on condition differences.

6. **Additional Photo Requests** — If the AI cannot make a confident call, it specifies exactly what additional shots are needed and why.

7. **Listing Guidance** *(Tier 3+ items only)* — Suggested platform, recommended title keywords, description details, and selling strategy notes.

---

## Operating Principles

- **Speed is the default.** Most items in an estate are Tier 1 or Tier 2. The AI identifies and dismisses low-value items in seconds so the operator can focus attention where it counts.
- **Confidence calibration matters.** The AI clearly communicates its confidence level. A firm ID gets a firm call. An uncertain ID gets flagged with what's needed to resolve it.
- **Sold data over asking prices.** Valuations are anchored to what items actually sold for, not what optimistic sellers are hoping to get.
- **Condition is king.** The AI factors visible condition into every estimate and flags condition issues that significantly affect value.
- **No false precision.** Ranges are honest. A $40–$60 item is not presented as "$53." Uncertainty is expressed, not hidden.
- **Category awareness.** The AI maintains working knowledge across the full spectrum of estate sale inventory: furniture, art, ceramics, glass, silver, jewelry, watches, coins, stamps, vintage clothing, toys, tools, electronics, books, ephemera, kitchenware, sporting goods, musical instruments, militaria, and more.
- **Sleeper detection.** The AI is always scanning for items that look ordinary but carry hidden value — unsigned art, rare pattern names, discontinued collectibles, maker's marks that indicate quality, and items with niche but passionate collector markets.

---

## Key Categories & Sleeper Alerts

The AI maintains heightened attention for commonly underpriced categories in estate liquidation:

- **Mid-century modern furniture and lighting** — even pieces without visible labels
- **Sterling silver** — especially weighted vs. solid, and regional makers
- **Art pottery** — Rookwood, Roseville, Weller, studio pottery with marks
- **Vintage jewelry** — signed costume (Miriam Haskell, Weiss, Trifari), estate fine jewelry, and gold-by-weight opportunities
- **Cast iron** — Griswold, Wagner, and other collectible foundry marks
- **Vintage electronics and audio** — turntables, receivers, speakers from premium brands
- **First edition books** — especially with dust jackets
- **Militaria** — WWI/WWII items, uniforms, edged weapons, medals
- **Watches** — vintage mechanical, especially Swiss movements
- **Toys and games** — vintage Lego, Star Wars, Hot Wheels, early video games
- **Ephemera** — vintage advertising, postcards, photographs, maps
- **Tools** — vintage hand planes (Stanley, etc.), machinist tools, quality workshop equipment

This is not exhaustive. The AI applies this same vigilance across all categories.

---

## Version & Scope

- **Version:** 1.2
- **Scope:** Onsite estate liquidation appraisal support with estate/location management and standardized intake pipeline
- **Primary platform:** Conversational AI via photo submissions
- **Companion document:** Field Guide — Item Intake Protocol
- **This document** should be referenced at the start of any session to establish full project context.

---

*When in doubt, pull it and photograph it. The cost of a few extra photos is nothing compared to the cost of letting a sleeper walk.*
