# Kisan Gaurav brand and design system

The system expresses a brand that is trusted, modern, farmer-first,
technology-driven, premium, and approachable.

## Principles

- Primary green communicates trust, progress, and decisive action.
- Secondary green brings warmth and agricultural energy.
- Earth brown grounds the palette in land, craft, and human experience.
- White keeps the experience clear and premium.
- Neutral grays support readable text, borders, and quiet surfaces.
- Cards use consistent rounded corners and soft green-tinted shadows.
- Spacing starts mobile-first and expands at Tailwind breakpoints.
- Semantic tokens keep component code independent of raw color values.

## JavaScript tokens

The public token modules live in `src/design-system`:

- `colors.js`: primary, secondary, earth, white, neutral, and semantic colors
- `typography.js`: display, heading, body, label, eyebrow, and caption styles
- `constants.js`: brand identity, spacing, layout, motion, radius, and shadow
  tokens
- `index.js`: single import surface for the complete system

JavaScript color tokens reference CSS custom properties. Hex values therefore
exist only once, in `src/index.css`.

## CSS and Tailwind tokens

Tokens are defined in `src/index.css` with the `--kg-*` prefix and mapped to
Tailwind utilities through `@theme inline`.

- Colors: `primary-*`, `secondary-*`, `earth-*`, `neutral-*`, `canvas`,
  `surface`, `surface-muted`, `foreground`, `foreground-muted`, `border`, and
  `on-primary`
- Radius: `rounded-control` and `rounded-card`
- Shadows: `shadow-soft`, `shadow-card`, and `shadow-lifted`
- Layout: `--kg-space-section`, `--kg-content-width`, and
  `--kg-reading-width`

## Components

Import primitives from `src/components/ui`:

```jsx
import {
  Badge,
  Button,
  Card,
  Container,
  Section,
  SectionHeading,
} from "./components/ui";
```

- `Button`: primary, secondary, and ghost variants in three sizes; supports
  polymorphic rendering through the `as` prop
- `Card`: standard or elevated surface with configurable padding
- `Container`: full, content, and reading widths
- `Section`: consistent vertical rhythm and surface tones
- `Badge`: compact green status or category label
- `SectionHeading`: consistent section-level typography

Components accept `className` for intentional local composition.
