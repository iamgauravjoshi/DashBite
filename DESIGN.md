# DESIGN.md — Universal Product & UI Design Standard

> A reusable design specification for SaaS, AI products, dashboards, web apps, mobile apps, and marketing websites.
>
> The system combines two strengths observed across high-quality public work:
> 1. strong visual hierarchy, presentation, and conversion-focused polish;
> 2. production-minded product design: states, real data, density, reusable systems, and implementation discipline.
>
> Do not copy a designer's surface style. Copy the decision quality.

---

## 0. How to Use This File

This document is written for designers, developers, and AI coding/design agents.

Interpret requirement words as:

- **MUST** — required unless there is a documented product reason not to.
- **SHOULD** — default behavior; override only intentionally.
- **MAY** — optional enhancement.
- **NEVER** — prohibited unless the product explicitly requires it.

When requirements conflict, use this priority order:

1. User comprehension
2. Task completion
3. Accessibility
4. Information hierarchy
5. Consistency
6. Responsiveness
7. Visual polish
8. Delight

A beautiful interface that slows the user down is not a successful interface.

---

# 1. North Star

Design interfaces that feel:

- clear before clever;
- premium without becoming decorative;
- dense when users need information;
- calm when users need focus;
- visually distinctive without sacrificing familiarity;
- responsive as a redesigned composition, not a scaled desktop;
- real enough to survive production data;
- systematic enough that screen 40 looks related to screen 4.

Every screen must answer:

1. Where am I?
2. What matters most here?
3. What can I do?
4. What changed?
5. What happens next?

If any answer is unclear within a few seconds, improve the hierarchy.

---

# 2. Core Design Principles

## 2.1 Clarity Over Complexity

- One primary purpose per screen or viewport region.
- One dominant visual focus per viewport.
- Do not make every element equally loud.
- Use progressive disclosure for secondary controls.
- Prefer recognition over recall.
- Prefer plain language over internal terminology.
- Use real labels; avoid ambiguous icon-only actions for important tasks.

## 2.2 Hierarchy Before Decoration

Establish hierarchy using, in this order:

1. position;
2. size;
3. spacing;
4. typography;
5. contrast;
6. color;
7. effects.

Do not use shadows, gradients, glow, blur, or animation to compensate for weak layout.

## 2.3 Calm Density

Whitespace is a tool, not a goal.

For working software:

- increase density when it improves comparison or scanning;
- reduce density around important decisions and forms;
- keep related data physically close;
- avoid huge empty areas that force unnecessary scrolling;
- allow compact/comfortable density modes for enterprise products when appropriate.

## 2.4 Real Product, Not Portfolio Theater

Every product interface MUST account for:

- loading;
- empty;
- zero-data;
- error;
- partial failure;
- long content;
- short content;
- permission restrictions;
- disabled states;
- success;
- destructive actions;
- latency;
- mobile;
- keyboard interaction where relevant.

A dashboard screenshot is not a product design.

## 2.5 Visual Restraint

Premium design usually comes from fewer stronger decisions.

Default:

- neutral surfaces;
- one primary accent;
- semantic status colors;
- limited elevation;
- limited radii;
- limited gradients;
- limited decorative illustrations.

Use expressive visuals where they improve brand memory, storytelling, or conversion—not everywhere.

---

# 3. Design Personality

The default product personality is:

**Modern + precise + calm + confident + slightly expressive**

Avoid:

- childish rounded-everything aesthetics;
- excessive glassmorphism;
- random neon gradients;
- every section inside a card;
- generic AI purple on every product;
- decorative charts;
- low-contrast gray-on-gray interfaces;
- “Dribbble-only” layouts that fail with real content.

A page should look designed, not styled.

---

# 4. Foundation Tokens

All implementation MUST use tokens. Avoid one-off values.

## 4.1 Spacing

Use a 4px base system.

```txt
space-0   = 0
space-1   = 4px
space-2   = 8px
space-3   = 12px
space-4   = 16px
space-5   = 20px
space-6   = 24px
space-8   = 32px
space-10  = 40px
space-12  = 48px
space-16  = 64px
space-20  = 80px
space-24  = 96px
space-32  = 128px
```

Default usage:

- icon ↔ label: 8px;
- label ↔ input: 8px;
- title ↔ description: 8–12px;
- elements inside cards: 12–16px;
- card padding: 16–24px;
- major page sections: 64–128px on desktop;
- mobile section gap: 48–80px.

Do not invent 13px, 19px, 27px spacing unless a technical constraint requires it.

## 4.2 Border Radius

```txt
radius-sm   = 6px
radius-md   = 10px
radius-lg   = 14px
radius-xl   = 20px
radius-2xl  = 28px
radius-pill = 999px
```

Rules:

- inputs/buttons: 8–12px;
- standard product cards: 10–16px;
- hero/media containers: 16–28px;
- pill radius only for chips, compact filters, statuses, or true capsules.

NEVER make all containers pill-shaped.

## 4.3 Borders

Default product border:

```txt
1px solid var(--border-subtle)
```

Prefer borders over shadows for separating dense product surfaces.

Use stronger borders for:

- focus;
- selected states;
- errors;
- drag/drop targets;
- active panels.

## 4.4 Elevation

Keep elevation scarce.

```txt
elevation-0 = none
elevation-1 = subtle card/menu separation
elevation-2 = dropdown/popover
elevation-3 = modal/floating layer
```

NEVER apply a shadow to every card.

If a layout works only because every container has a shadow, fix the hierarchy.

---

# 5. Color System

## 5.1 Semantic Architecture

Define colors by purpose, not by hex name.

```txt
--bg-canvas
--bg-surface
--bg-surface-raised
--bg-inverse

--text-primary
--text-secondary
--text-tertiary
--text-inverse

--border-subtle
--border-default
--border-strong

--accent
--accent-hover
--accent-soft
--accent-contrast

--success
--warning
--danger
--info
```

## 5.2 Palette Strategy

Default visual strategy:

- 70–85% neutrals;
- 10–20% brand/accent;
- <10% semantic or expressive color.

Use **one primary accent family** across a product.

A second expressive color MAY be used for:

- meaningful comparison;
- brand highlights;
- one special CTA;
- charts where another data series is necessary.

Do not create a rainbow dashboard by assigning a new color to every metric.

## 5.3 Dark Mode

Dark mode is not inverted light mode.

MUST:

- reduce pure black/pure white usage;
- preserve hierarchy with surface luminance;
- reduce saturation for large colored areas;
- use borders and spacing instead of exaggerated shadows;
- validate chart contrast separately.

---

# 6. Typography

## 6.1 Font Strategy

Use one high-quality sans-serif family by default.

Good categories:

- neo-grotesk;
- geometric sans with strong readability;
- variable fonts with multiple weights.

A display serif MAY be used on marketing pages for editorial contrast, but not for dense application UI.

## 6.2 Scale

Recommended desktop scale:

```txt
xs       12px / 16
sm       14px / 20
base     16px / 24
lg       18px / 26
xl       20px / 28
2xl      24px / 32
3xl      32px / 40
4xl      40px / 48
5xl      48px / 56
6xl      64px / 68
display  72–96px / 0.95–1.05
```

Product UI SHOULD mostly live between 12px and 24px.

Marketing pages MAY use larger display typography.

## 6.3 Weight

Default:

- body: 400–450;
- labels: 500;
- button: 500–600;
- section title: 600;
- large display: 500–700 depending on font.

Avoid fake hierarchy created by making everything bold.

## 6.4 Text Width

For readable prose:

```txt
max-width: 60–75ch
```

Marketing hero copy SHOULD usually be narrower than the viewport.

## 6.5 Numbers

Dashboards MUST use tabular numerals for:

- currency;
- metrics;
- time;
- percentages;
- financial tables;
- rapidly updating values.

Align numbers consistently.

---

# 7. Layout System

## 7.1 Marketing Website Grid

Desktop:

- max content width: 1200–1280px;
- 12-column grid;
- page padding: 24–48px;
- section spacing: 80–128px.

Tablet:

- 8 columns;
- 24–32px padding.

Mobile:

- 4 columns;
- 16–20px side padding;
- avoid more than two columns for primary content.

## 7.2 Product / Dashboard Grid

Typical desktop app shell:

```txt
Sidebar: 220–264px
Top bar: 56–72px
Content max width: fluid or 1440–1600px depending on use case
Content padding: 20–32px
Grid gap: 16–24px
```

Data-heavy software MAY be full-width.

Do not force a narrow centered marketing container onto an enterprise dashboard.

## 7.3 Alignment

MUST align:

- card edges;
- section titles;
- chart baselines;
- table numeric columns;
- form labels;
- button groups;
- icon optical centers.

Misalignment makes polished UI feel amateur faster than almost any other issue.

---

# 8. Composition Rules

## 8.1 One Focal Point

Each viewport should have one strongest point:

- hero headline;
- key metric;
- active workflow;
- primary CTA;
- current object/detail.

Secondary elements support it.

## 8.2 Avoid Card Soup

Do not wrap everything in a card.

Use cards when a region is:

- independently interactive;
- independently movable;
- semantically grouped;
- comparable to sibling units;
- elevated above the page context.

Otherwise use whitespace, separators, headings, and alignment.

## 8.3 Contrast Layers

A strong composition normally uses three contrast levels:

1. primary content;
2. supporting content;
3. metadata.

If every label, number, border, icon, and button has the same contrast, scanning becomes difficult.

---

# 9. Navigation

## 9.1 Product Navigation

Sidebars SHOULD:

- group items by user mental model;
- show current location clearly;
- keep common destinations visible;
- collapse rarely used admin/settings areas;
- use consistent icons;
- avoid more than ~7 top-level groups without hierarchy.

Active item:

- visible without relying on color alone;
- usually uses background + text/icon contrast;
- SHOULD not use a large glowing effect.

## 9.2 Top Bars

Use for:

- page context;
- global search;
- organization/project switcher;
- notifications;
- profile;
- primary page-level actions.

Do not duplicate sidebar navigation inside the top bar.

## 9.3 Breadcrumbs

Use when the information architecture is deep or objects have parents.

Examples:

```txt
Projects / Acme / Settings
Customers / Acme Ltd / Invoices / INV-2048
```

---

# 10. Buttons & Actions

## 10.1 Hierarchy

Use:

- **Primary** — one main action per region;
- **Secondary** — common alternative;
- **Tertiary/Ghost** — low emphasis;
- **Destructive** — delete/remove/irreversible.

Avoid two equally loud primary buttons beside each other.

## 10.2 Sizing

Recommended:

```txt
sm: 32–36px high
md: 40px high
lg: 44–48px high
```

Touch targets SHOULD be at least 44×44px.

## 10.3 Labels

Use verbs:

- Create report
- Add member
- Save changes
- Send invoice

Avoid vague labels:

- Continue, when destination is unclear;
- Submit, when a specific action is available;
- Click here;
- Proceed.

---

# 11. Inputs & Forms

MUST:

- keep persistent labels;
- show required/optional intentionally;
- validate near the field;
- retain valid values after errors;
- explain formatting before failure where practical;
- support keyboard navigation;
- use correct input types;
- provide visible focus.

Form layout:

- one column by default;
- two columns only for logically paired, short fields;
- long forms use sections or steps;
- destructive choices require explicit confirmation.

Do not use placeholder text as the only label.

---

# 12. Cards

A good product card has:

1. clear purpose;
2. one main datum or content group;
3. limited actions;
4. consistent internal spacing;
5. predictable interaction.

Recommended anatomy:

```txt
eyebrow / label
title or key value
supporting context
optional visualization
optional action
```

Avoid:

- five different font sizes;
- multiple competing accent colors;
- unnecessary nested cards;
- huge decorative icons;
- gradient backgrounds behind routine data.

---

# 13. Tables

Tables are often better than cards for operational data.

MUST:

- align numeric columns right;
- align text columns left;
- keep headers visible for long tables where possible;
- provide sort/filter only where meaningful;
- preserve column consistency;
- truncate carefully;
- allow full value on hover/focus or detail view;
- show empty state;
- show loading state;
- show pagination or virtualization strategy.

For row actions:

- expose the most common action;
- group rare actions in an overflow menu.

Use status chips sparingly.

Do not convert every table row into a giant card on desktop.

---

# 14. Data Visualization

Every chart MUST answer a user question.

Before adding a chart, write the question:

> “How has revenue changed over the last 30 days?”

> “Which channels produce the most verified leads?”

> “Where are failures increasing?”

If no clear question exists, do not add the chart.

## 14.1 Chart Rules

- Use line charts for trends.
- Use bars for category comparison.
- Use stacked bars only when part-to-whole across categories matters.
- Use donut/pie charts only for simple part-to-whole with few segments.
- Avoid 3D charts.
- Avoid gratuitous gradients.
- Prefer direct labels when possible.
- Keep legends close to data.
- Keep gridlines subtle.
- Use accessible color contrast.
- Do not rely on color alone.
- Avoid more than 4–5 simultaneous series without interaction.

## 14.2 KPI Cards

Show:

- metric;
- current value;
- period/context;
- meaningful comparison;
- trend only when it helps decision-making.

Bad:

```txt
Revenue
$24,392
+12%
```

Better:

```txt
Revenue
$24,392
+12.4% vs previous 30 days
```

Context is part of the data.

---

# 15. Dashboard Design

Dashboard priorities:

1. orientation;
2. important status;
3. exceptions;
4. trends;
5. detailed work;
6. secondary analysis.

Recommended structure:

```txt
Page title + filters + primary action

Critical alerts / exceptions (only when needed)

3–5 key metrics

Primary chart or operational overview

Secondary breakdowns

Detailed table / queue / activity
```

Avoid a top row with 8–12 tiny KPIs.

## 15.1 Operational Dashboards

For ERP, e-commerce, IoT, finance, CRM, and admin tools:

- show actionable exceptions early;
- enable filtering near the affected content;
- surface data freshness;
- show status and system health;
- prioritize queues/tasks over decorative summaries;
- provide drill-down;
- support bulk actions;
- make tables first-class.

---

# 16. Marketing Websites

The marketing style should feel authored, not template-generated.

## 16.1 Hero Formula

A strong hero contains:

1. specific outcome;
2. specific audience or context;
3. credibility/proof;
4. one primary CTA;
5. product/service evidence.

Example structure:

```txt
Headline:
Ship enterprise dashboards your operators can understand in seconds.

Support:
Product design and development for data-heavy SaaS teams.

Primary CTA:
Book a product review

Secondary CTA:
View case studies

Visual:
Real product UI or real project evidence
```

Avoid abstract “revolutionize your future” copy.

## 16.2 Page Story

Recommended order:

1. Hero / positioning
2. Proof / trusted by / key metrics
3. Problem or user reality
4. Product/service mechanism
5. Real UI/work
6. Benefits or use cases
7. Workflow/process
8. Case study / evidence
9. Pricing or engagement model if appropriate
10. FAQ
11. Final CTA

The page should make an argument, not just stack sections.

## 16.3 Visual Language

Marketing pages MAY be more expressive than the product UI:

- oversized typography;
- editorial layouts;
- art-directed imagery;
- strategic gradients;
- motion;
- asymmetric composition.

But product screenshots shown inside marketing pages should remain realistic.

---

# 17. Product Screenshots & Portfolio Presentation

Presentation matters, but do not let presentation hide weak UI.

Good showcase:

- one strong hero frame;
- close-up details;
- responsive/mobile variations;
- before/after where relevant;
- real flows;
- state variations;
- design-system/component views;
- concise problem → decision → result explanation.

Avoid:

- ten device mockups that make UI unreadable;
- excessive 3D perspective;
- reflections and shadows stronger than the design;
- tiny screens surrounded by decorative backgrounds;
- case studies consisting only of polished final frames.

Show the work large enough to judge.

---

# 18. Mobile Design

Mobile is not desktop stacked vertically.

MUST reconsider:

- navigation;
- information priority;
- action placement;
- table behavior;
- chart complexity;
- filter patterns;
- keyboard overlap;
- touch reach;
- sticky actions;
- long text;
- modal behavior.

## 18.1 Mobile Defaults

- side padding: 16–20px;
- touch targets: ≥44px;
- body text: generally ≥16px for reading-heavy pages;
- bottom navigation: use for 3–5 primary destinations when appropriate;
- sheets: good for short contextual tasks;
- full-screen flows: better for complex tasks.

For data tables on mobile, choose one:

- horizontal scroll;
- priority columns;
- row detail drill-down;
- purpose-built card representation.

Do not blindly stack every table column into a huge card.

---

# 19. Responsive Design

Design breakpoints around content stress, not device names.

Suggested engineering breakpoints MAY begin near:

```txt
sm  640px
md  768px
lg  1024px
xl  1280px
2xl 1536px
```

But the UI determines actual breakpoints.

Responsive rules:

- preserve hierarchy;
- reflow before shrinking text;
- reduce columns when content becomes cramped;
- maintain usable hit areas;
- remove nonessential decoration before removing useful information;
- test at intermediate widths, not only preset devices.

---

# 20. States

Every reusable component must define relevant states.

## 20.1 Interactive States

- default;
- hover;
- focus-visible;
- active/pressed;
- selected;
- disabled;
- loading.

## 20.2 Data States

- loading;
- skeleton;
- empty;
- zero result;
- partial data;
- stale data;
- error;
- offline;
- restricted permission.

## 20.3 Empty States

A useful empty state contains:

- what is missing;
- why it matters;
- what the user can do next.

Example:

```txt
No automations yet

Automations can move leads between stages and notify your team automatically.

[Create automation]
```

Avoid “Nothing here :)”.

---

# 21. Error Design

Errors must help recovery.

Good error anatomy:

```txt
What happened
Why it may have happened
What remains safe
What the user can do now
Support/debug ID when useful
```

For high-risk domains:

- never hide failed operations;
- never fake success;
- keep auditability;
- use explicit confirmation for irreversible actions.

---

# 22. Search, Filters & Sorting

Search:

- should match user vocabulary;
- show clear results count when useful;
- preserve query on return;
- support empty/no-result recovery.

Filters:

- position near the content they affect;
- display active filters;
- allow “Clear all”;
- avoid deeply nested filter modals for simple data;
- use chips only when chips improve scanning.

Enterprise dashboards SHOULD support shareable filter state in URL when practical.

---

# 23. Motion & Micro-interactions

Motion communicates:

- causality;
- hierarchy;
- state change;
- spatial relationship;
- progress.

Motion should not exist only to look expensive.

## 23.1 Timing

Typical:

```txt
micro:       100–160ms
control:     160–220ms
panel:       200–300ms
page/hero:   300–500ms
```

Prefer ease-out for entering and ease-in for leaving.

## 23.2 Rules

- animate transform/opacity where possible;
- avoid long blocking transitions;
- do not animate every card on scroll;
- respect `prefers-reduced-motion`;
- loading animation must not imply fake progress;
- use subtle feedback for drag, toggle, save, and state changes.

---

# 24. Iconography

Use one icon family per product.

Rules:

- consistent stroke/weight;
- consistent optical size;
- align icons optically, not mechanically;
- 16–20px for dense UI;
- 20–24px for standard controls;
- pair unfamiliar icons with labels;
- do not use decorative icons as substitutes for hierarchy.

---

# 25. Imagery & Illustration

Use visuals that prove or explain something.

Prefer:

- real product screens;
- real customer/product photography;
- diagrams;
- purposeful illustrations;
- data;
- before/after.

Avoid generic stock imagery when proof is available.

On marketing pages, one excellent visual is better than six weak ones.

---

# 26. Accessibility

Target WCAG AA minimum.

MUST:

- provide sufficient text contrast;
- provide visible focus;
- support keyboard navigation;
- use semantic HTML;
- label icon-only controls;
- expose validation errors programmatically;
- avoid color-only meaning;
- support zoom;
- respect reduced motion;
- use meaningful heading order;
- provide alt text for meaningful images;
- hide decorative images from assistive tech;
- keep touch targets usable.

Accessibility is part of polish.

---

# 27. Content Design

Use sentence case by default.

Prefer:

- short labels;
- concrete verbs;
- specific outcomes;
- useful empty/error copy;
- scannable headings.

Avoid:

- buzzword stacking;
- fake urgency;
- vague AI language;
- redundant helper text;
- “click here”;
- overly cute messages in serious workflows.

## 27.1 Numbers & Dates

Use localizable formats.

Do not hardcode:

- currency format;
- thousands separators;
- date order;
- timezone assumptions.

---

# 28. Design Systems

A production design system MUST include:

- primitives/tokens;
- semantic tokens;
- typography;
- spacing;
- color;
- radii;
- elevation;
- iconography;
- components;
- variants;
- states;
- responsive behavior;
- accessibility notes.

## 28.1 Component Definition

Every component spec SHOULD document:

```txt
Purpose
Anatomy
Variants
Sizes
States
Content limits
Responsive behavior
Keyboard behavior
Accessibility
Do / Don't
```

## 28.2 Component Reuse

Reuse when behavior and meaning are the same.

Do not reuse only because two things look similar.

---

# 29. Engineering Handoff

Design must be implementable without interpretation roulette.

MUST provide:

- tokens;
- component variants;
- responsive rules;
- interaction states;
- empty/loading/error states;
- realistic content;
- validation rules;
- icon source;
- behavior notes;
- chart data expectations;
- animation behavior where important.

Avoid “magic values” in implementation.

Prefer:

```css
padding: var(--space-6);
border-radius: var(--radius-lg);
color: var(--text-primary);
```

over arbitrary one-off values.

---

# 30. Performance-Aware Design

Design decisions affect speed.

Prefer:

- system or optimized variable fonts;
- compressed responsive images;
- lightweight motion;
- minimal oversized background video;
- progressive media loading;
- skeletons only when wait time justifies them.

Do not make a 4 MB hero animation the price of viewing a headline.

---

# 31. AI Product UX

Do not default to a chat box.

Choose interaction by task:

- generation → composer + preview;
- extraction → structured result;
- classification → inline suggestion;
- automation → rule/agent builder;
- research → sourced answer;
- command → command bar;
- writing → contextual action;
- review → diff/approval queue.

## 31.1 AI Trust

AI features SHOULD communicate:

- what data is used;
- what the AI is doing;
- when it is uncertain;
- whether the output is saved/applied;
- how to review;
- how to undo;
- sources/citations when truth matters.

High-impact actions require explicit review.

---

# 32. “AI Slop → Production UI” Cleanup Pass

When improving AI-generated interfaces, use this sequence.

## Pass 1 — Remove Noise

Delete:

- unnecessary gradients;
- random glass cards;
- decorative blobs;
- excessive icons;
- duplicated headings;
- fake metrics;
- needless badges.

## Pass 2 — Fix Structure

- establish one page goal;
- define primary action;
- create a grid;
- align sections;
- define navigation hierarchy.

## Pass 3 — Normalize Tokens

- spacing;
- typography;
- radius;
- border;
- colors;
- icon sizes.

## Pass 4 — Add Real Content

Test:

- 3-character names;
- 47-character names;
- large numbers;
- zero values;
- negative values;
- long table rows;
- missing avatars;
- missing images;
- slow loading.

## Pass 5 — Add States

Design:

- loading;
- empty;
- error;
- permission;
- disabled;
- success;
- partial data.

## Pass 6 — Improve Interaction

- keyboard;
- focus;
- filtering;
- sorting;
- bulk actions;
- confirmation;
- undo where possible.

## Pass 7 — Add Polish Last

Only then add:

- subtle motion;
- brand details;
- refined illustration;
- premium mockups;
- expressive typography.

---

# 33. Patterns for SaaS & Enterprise Products

## 33.1 Settings

Use vertical navigation when settings contain many categories.

Group by domain:

```txt
General
Members & roles
Billing
Integrations
Security
Notifications
API
```

Show unsaved changes clearly.

## 33.2 Permissions

Permissions UI MUST explain:

- who has access;
- what they can do;
- scope;
- inheritance;
- exceptions.

Prefer role + capability matrices over vague “admin / user” labels when complexity requires it.

## 33.3 Activity Logs

Include:

- actor;
- action;
- object;
- timestamp;
- result;
- optional metadata.

Make logs searchable for operational software.

## 33.4 Onboarding

Onboarding should get users to first value quickly.

Avoid long carousel tutorials.

Use:

- sample data;
- setup checklist;
- contextual education;
- progressive configuration.

---

# 34. Design Patterns for E-commerce

Prioritize:

- product discoverability;
- trust;
- clear pricing;
- delivery expectations;
- payment clarity;
- easy comparison;
- prominent cart state.

Product pages SHOULD show:

- product name;
- price;
- variant;
- availability;
- imagery;
- primary purchase action;
- shipping/return reassurance;
- useful specifications.

Do not hide cost surprises until checkout.

---

# 35. Design Patterns for Fintech

Prioritize:

- trust;
- legibility;
- precision;
- reconciliation;
- auditability.

Use:

- tabular numbers;
- explicit date ranges;
- currency codes when ambiguous;
- positive/negative semantics beyond color;
- confirmation before transfers;
- clear pending/settled/failed states.

Never use decorative ambiguity around money.

---

# 36. Design Patterns for Healthcare

Prioritize:

- safety;
- clarity;
- permissions;
- timestamps;
- patient identity;
- provenance;
- recoverability.

Do not:

- make critical warnings subtle;
- rely on color alone;
- obscure medication units;
- hide system status;
- let AI output appear authoritative without review.

---

# 37. Design Patterns for IoT / Monitoring

Prioritize:

- current system health;
- alerts;
- recency;
- severity;
- location/device;
- trend;
- action.

Every live metric SHOULD show freshness or timestamp when stale data could mislead users.

Alerts need:

- severity;
- affected asset;
- time;
- cause/context;
- recommended next action;
- acknowledgement/resolution state.

---

# 38. What to Borrow From Strong Visual Designers

Borrow:

- bold but controlled hierarchy;
- stronger art direction;
- visually memorable hero sections;
- good use of product mockups;
- clean spacing;
- tighter composition;
- conversion-aware CTAs;
- confident presentation.

Do not blindly borrow:

- giant radii;
- trend-driven gradients;
- excessive device mockups;
- unrealistic placeholder dashboards;
- style without workflow.

---

# 39. What to Borrow From Strong Product-System Designers

Borrow:

- realistic data;
- edge states;
- information density;
- systematic tokens;
- component reuse;
- meaningful charts;
- design-to-code thinking;
- permission/state awareness;
- accessibility;
- production constraints.

Do not let system rigor make the interface visually anonymous.

A strong product can be both practical and memorable.

---

# 40. Universal Signature Recipe

For a polished contemporary interface, start here:

### Product UI

- neutral canvas;
- strong type hierarchy;
- single cool accent (indigo/blue/green based on brand);
- subtle borders;
- minimal shadow;
- 10–16px standard radii;
- crisp side navigation;
- realistic charts;
- strong tables;
- one expressive detail per screen;
- dense-but-calm content.

### Marketing UI

- editorial headline;
- clear argument;
- more generous whitespace;
- real product proof;
- restrained accent color;
- one distinctive art-direction move;
- confident CTA;
- minimal generic icon-card sections.

### Mobile

- simplify, don't shrink;
- move primary actions into thumb reach;
- reduce simultaneous data;
- preserve critical context;
- use sheets for contextual actions;
- design empty/error states intentionally.

---

# 41. Anti-Patterns

NEVER default to:

- 24px radius on every element;
- purple gradient everywhere;
- frosted glass everywhere;
- 12 KPI cards above the fold;
- centered text for long content;
- every section inside a border;
- vague hero copy;
- gray text with insufficient contrast;
- tiny 12px body copy on marketing pages;
- 6 button styles;
- inconsistent icon families;
- meaningless charts;
- charts without units/date ranges;
- placeholder-only form labels;
- auto-playing complex animation;
- 3D mockups that make UI impossible to inspect;
- “responsive” layouts that only shrink;
- mobile tables converted into unreadable card walls.

---

# 42. Visual QA Checklist

Before approving a screen:

- [ ] Is the primary purpose obvious?
- [ ] Is the primary action obvious?
- [ ] Is there one clear focal point?
- [ ] Are alignments clean?
- [ ] Is spacing tokenized?
- [ ] Is typography consistent?
- [ ] Are colors semantic?
- [ ] Are borders/shadows restrained?
- [ ] Are icons consistent?
- [ ] Are real content lengths tested?
- [ ] Does the layout work at intermediate widths?
- [ ] Is mobile intentionally designed?
- [ ] Are empty/loading/error states present?
- [ ] Is keyboard/focus behavior considered?
- [ ] Is contrast accessible?
- [ ] Can a developer build it without guessing?

---

# 43. Dashboard QA Checklist

- [ ] Does each chart answer a named question?
- [ ] Are date ranges explicit?
- [ ] Are units explicit?
- [ ] Are numbers aligned?
- [ ] Are trends contextualized?
- [ ] Are exceptions visible?
- [ ] Can users drill down?
- [ ] Are filters close to affected data?
- [ ] Can users recover from zero/no results?
- [ ] Are important operational actions visible?
- [ ] Are tables used where comparison matters?
- [ ] Is data freshness visible when relevant?

---

# 44. Marketing Page QA Checklist

- [ ] Can a visitor repeat what the company/product does after 10 seconds?
- [ ] Does the hero state an outcome?
- [ ] Is the audience clear?
- [ ] Is there proof?
- [ ] Is one CTA dominant?
- [ ] Does the page sequence answer buyer questions in order?
- [ ] Are visuals real evidence rather than filler?
- [ ] Is typography distinctive but readable?
- [ ] Are repetitive card grids minimized?
- [ ] Does mobile retain the same argument?
- [ ] Is performance acceptable?

---

# 45. Scoring Rubric

Score a design out of 100.

```txt
25  Task clarity & UX
15  Information hierarchy
15  System consistency
15  Visual craft
10  Responsive behavior
10  Accessibility
 5  State completeness
 5  Engineering feasibility/performance
---
100
```

Interpretation:

```txt
90–100  Production-grade, distinctive, highly coherent
80–89   Strong; needs targeted refinement
70–79   Competent but generic/incomplete
60–69   Visually plausible, product logic weak
<60     Redesign structure before polishing
```

A visually beautiful design cannot score above 79 if major states, responsiveness, or accessibility are missing.

---

# 46. Final Rule

When choosing between two versions, ask:

> Which version helps the intended user understand, decide, and act faster while still feeling intentional and trustworthy?

Choose that one.

Then polish it.
