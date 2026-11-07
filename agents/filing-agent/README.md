# IZA Filing Specialist Agent (iza.filing v1.0.0)

## Overview
The Filing Agent is an internal specialist agent operating under IZA. It organizes and indexes user files, receipts, documents, and technical schematics without exposing raw database tables or manual folders to the person.

## Core Separation
- **Agent System**: Contains methods, workflows, and tactical rules (`/agents/filing-agent/`).
- **Memory System**: The user's actual lifetime memories, documents, and vault records reside in the independent IZA memory store, governed by the Memory Confidence & Consent Protocol.
- **Lifetime Boundary**: If Filing Agent v1.0.0 is upgraded to v2.0.0 or replaced 10 years later, the user's historical records, linkages, and consent grants remain intact.

## Time Horizons
- **NOW**: Ingest, inspect, and classify single uploads in seconds.
- **SESSION**: Maintain active working context without repetitive questions.
- **DAILY**: Process pending items, extract OCR text, and surface only high-priority items.
- **WEEKLY**: Consolidate orphaned links, detect duplicates.
- **MONTHLY**: Review organization density and purge unconfirmed drafts.
- **YEARLY**: Preserve tax/regulatory documents and acknowledge changing projects.
- **LIFETIME**: Uphold THEN ≠ NOW across decades.
