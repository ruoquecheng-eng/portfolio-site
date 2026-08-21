<!-- SEED: re-run $impeccable document once there is rendered code to capture the final tokens and components. -->
---
name: Wanzheng Ning Portfolio
description: An evidence-led technical and academic portfolio shaped by networks, signals, and mathematical structure.
---

# Design System: Wanzheng Ning Portfolio

## Overview

**Creative North Star: "Calibrated Signal Console"**

The site should feel like a carefully calibrated network instrument viewed beside a clean diagnostic report. Deep navy surfaces establish system context; high-contrast light surfaces carry long-form evidence. Fine signal traces, nodes, and measured grid lines support the content without becoming a hacker costume.

The interface rejects cyberpunk developer templates, university marketing pages, dream-school lists, generic startup landing pages, and skill-logo walls. Motion is responsive and restrained. The site remains complete when animation is disabled.

**Key Characteristics:**

- Deep system panels paired with pale evidence sheets
- One cobalt-cyan signal family, used with restraint
- Strong typographic hierarchy and compact technical labels
- Cardless editorial flow for major work, bounded cards only for project summaries
- Real figures and explicit evidence captions

## Colors

The palette is committed in the hero and restrained in reading surfaces. The seed hue is cobalt at 230 degrees in OKLCH.

### Primary

- **Signal Cobalt:** anchors links, active navigation, nodes, and diagnostic states.
- **Instrument Navy:** carries the hero and selected system sections.

### Secondary

- **Trace Cyan:** marks flow, focus, and selected evidence without becoming neon.

### Neutral

- **Diagnostic White:** primary light reading surface.
- **Cool Sheet:** secondary light section surface.
- **Graphite Ink:** body text and dark marks.
- **Slate Reading Text:** secondary information with accessible contrast.

**The Signal Budget Rule.** Bright cyan is a state and flow color, not a background texture. It should occupy less than ten percent of a reading screen.

## Typography

**Display Font:** Bahnschrift with Aptos Display and Segoe UI fallbacks  
**Body Font:** Aptos with Segoe UI Variable and Segoe UI fallbacks  
**Label/Mono Font:** Cascadia Mono with ui-monospace fallbacks

**Character:** The display face reads like instrument labeling, while the body face remains quiet enough for admissions review and mathematical summaries.

### Hierarchy

- **Display** (650, fluid up to 5.5rem, 0.98): hero statement only.
- **Headline** (650, fluid up to 3.5rem, 1.05): page and major section headings.
- **Title** (650, fluid up to 1.5rem, 1.2): project and research titles.
- **Body** (400, 1rem to 1.125rem, 1.7): prose capped near 70 characters.
- **Label** (600, 0.75rem, 0.05em): short statuses, versions, and figure identifiers.

**The One Instrument Label Rule.** Monospace appears only for code, versions, formulas, and compact technical metadata. It never replaces body typography.

## Elevation

The system is flat by default. Depth comes from tonal layering, section boundaries, and media contrast. A small shadow may appear on an interactive project summary at hover, but major sections do not float as cards.

**The Flat Evidence Rule.** Evidence is aligned and bordered, not placed in decorative glass panels.

## Components

### Buttons

- **Shape:** compact rounded rectangle, 8 px radius.
- **Primary:** Signal Cobalt fill with near-white text and 12 px by 18 px padding.
- **Hover / Focus:** small vertical shift on hover; 3 px high-contrast focus ring on keyboard focus.
- **Secondary:** transparent surface with a single structural border.

### Chips

- **Style:** small status labels with text plus shape or border distinction.
- **State:** status is always written in full; color is never the only signal.

### Cards / Containers

- **Corner Style:** 12 px maximum.
- **Background:** tonal surface change, no glass blur.
- **Shadow Strategy:** none at rest; small state shadow only when interactive.
- **Border:** one subtle structural border when a boundary is necessary.
- **Internal Padding:** fluid 20 px to 32 px.

### Navigation

The desktop navigation is a slim system bar with clear active state. Mobile navigation uses a native button and a compact disclosure panel. Theme control has an explicit accessible label.

### Diagnostic Flow

The signature component is an ordered flow of labeled stages connected by a single signal trace. It is explicitly captioned as a conceptual diagnostic flow and never presented as a measured network topology.

## Do's and Don'ts

### Do:

- **Do** keep body copy at or above 4.5:1 contrast and graphical evidence at or above 3:1 where required.
- **Do** use real result figures with captions that state simulated or internal holdout context.
- **Do** keep headings below 6rem and display letter spacing no tighter than -0.04em.
- **Do** provide visible focus, reduced motion, explicit dimensions, and print styles.
- **Do** use High-Speed Rail and Scenic Guide as bounded project summaries in V2.

### Don't:

- **Don't** resemble a cyberpunk developer template, university marketing page, dream-school list, generic startup landing page, or skill-logo wall.
- **Don't** use fake terminals, code rain, hacker aesthetics, neon overload, custom cursors, heavy parallax, particle fields, glassmorphism, glowing borders, or meaningless animation.
- **Don't** use gradient text, repeated section eyebrows, decorative numbered sections, side-stripe callouts, or oversized rounded cards.
- **Don't** place unconfirmed facts, private paths, sensitive files, or internal TODO markers in public output.

