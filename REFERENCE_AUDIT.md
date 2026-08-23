# Portfolio spacing reference audit

Measured in a 1440 x 1000 headless Chrome viewport on 23 August 2026. Pixel ranges are approximate and describe visible section rhythm, not reusable source values. The goal is to extract spacing rules without copying layout, typography, color, components, or identity.

| Reference | Type | What works | Approx spacing | Relevant lesson |
|---|---|---|---|---|
| [LUMEN](https://like-shop.github.io/lumen-dev/) | Technical portfolio | Clear separation between major narrative beats | Hero about 90-120 px; many sections about 150 px per side | Reserve very large spacing for rare transitions. Its repeated full-screen spacing is too sparse for this portfolio. |
| [Marco Volpini](https://www.marcovolpini.com/) | Electrical engineering portfolio | Hero, project, experience, and skills areas have visibly different roles | Hero about 80 px; major bands about 96-128 px | A small spacing hierarchy is more useful than one universal section value. The 128 px regular bands are still too loose for long case studies here. |
| [Alex Lu](https://six061.com/) | Systems engineering portfolio | Dense project evidence remains easy to scan because repeated items share a stable rhythm | Major transitions about 96-104 px; dense content inside each block | Consistency helps, but card-heavy presentation is not appropriate for the current editorial identity. |
| [Kamron Soltani](https://kamronsoltani.com/) | Graduate engineering portfolio | Multiple engineering experiences remain continuous at desktop size | Most major sections about 64-72 px per side | Content-heavy engineering sections can feel mature at roughly 64-80 px without becoming cramped. |
| [Paul Khoury](https://khourypaul.github.io/portfolio/) | Engineering reference portfolio | Very high scanability and immediate access to technical evidence | Section padding near 0; heading gaps about 14-20 px | Academic and engineering credibility does not require large blank zones. This density is too extreme to adopt directly. |
| [Tri Dao](https://tridao.me/) | Computer science researcher site | Publications and metadata carry hierarchy with very little ornamental spacing | Compact publication rows; limited explicit section padding | Research pages should rely on reading width, metadata, and dividers rather than landing-page-sized gaps. |
| [Sarah Dean](https://sdean.website/) | Academic research portfolio | Long research history stays navigable through narrow reading measures and continuous structure | Major content is nearly continuous; outer spacing is restrained | Preserve academic calm through typography and rules, not by separating every item with a large empty band. |
| [Lilian Weng](https://lilianweng.github.io/) | Research writing portfolio | Repeated article entries keep titles, metadata, and summaries closely related | Article rows about 24 px top and bottom | Evidence and metadata sections benefit from tight internal spacing while major page transitions can remain larger. |

## Patterns worth adopting

- Use three section levels: tight for evidence and dense lists, normal for ordinary content, and large only for hero-to-content or genuine narrative transitions.
- Keep heading-to-content distance below the section padding so headings remain attached to what they introduce.
- Treat two adjacent sections as one visual transition. Their bottom and top padding should not simply add into a 200 px or larger gap.
- Let research pages gain calm from reading width, metadata, captions, and thin dividers.
- Reduce spacing further on mobile while retaining at least 44-48 px around major content groups.

## Patterns to avoid

- Repeating 120-150 px padding on every section.
- Full-screen sections for ordinary project or research content.
- Floating dividers with equally large empty areas above and below.
- Using a dense card grid to solve content continuity.
- Compressing academic content to reference-manual density.
- Copying another site's visual identity, components, or typography.

## Recommended spacing system for this portfolio

| Token | Intended range | Use |
|---|---:|---|
| `--space-section-tight` | 48-64 px | Evidence, metrics, compact lists, and the leading side of adjacent sections |
| `--space-section-normal` | 60-84 px | Standard project and research sections |
| `--space-section-large` | 72-112 px | Hero transitions and rare narrative breaks |
| `--space-content` | 28-48 px | Internal content groups and figure stacks |
| `--space-heading` | 32-52 px | Section heading to first content item |

Operational rules:

- Hero to first major section: about 96-112 px on wide desktop.
- Adjacent standard sections: keep the content-to-content transition near 110-140 px by combining a normal bottom edge with a tight next top edge.
- Project rows: about 32-48 px per side, producing a readable 64-96 px item rhythm without turning each item into a screen.
- Case-study sections: about 64-84 px, with dense evidence areas at about 48-64 px.
- Mobile sections: about 48-64 px; mobile hero transitions: about 56-72 px.
- Typography, color, content, and page structure remain unchanged.
