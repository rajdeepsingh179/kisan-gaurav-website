export const BRAND = Object.freeze({
  name: "Kisan Gaurav",
  tagline: "Technology rooted in trust",
  description:
    "Practical digital tools and trusted information built for Indian agriculture.",
});

export const spacing = Object.freeze({
  containerX: "px-4 sm:px-6 lg:px-8",
  sectionY: "py-[var(--kg-space-section)]",
  stackSm: "space-y-3",
  stackMd: "space-y-5",
  stackLg: "space-y-8",
});

export const layout = Object.freeze({
  content: "max-w-[var(--kg-content-width)]",
  reading: "max-w-[var(--kg-reading-width)]",
});

export const motion = Object.freeze({
  easing: Object.freeze([0.22, 1, 0.36, 1]),
  revealDuration: 0.55,
  heroDuration: 0.65,
  stagger: 0.055,
});

export const radii = Object.freeze({
  control: "var(--kg-radius-control)",
  card: "var(--kg-radius-card)",
});

export const shadows = Object.freeze({
  soft: "var(--kg-shadow-soft)",
  card: "var(--kg-shadow-card)",
  lifted: "var(--kg-shadow-lifted)",
});
