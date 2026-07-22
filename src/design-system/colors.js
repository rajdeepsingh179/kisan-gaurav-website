const palette = (name) =>
  Object.freeze({
    50: `var(--kg-${name}-50)`,
    100: `var(--kg-${name}-100)`,
    200: `var(--kg-${name}-200)`,
    300: `var(--kg-${name}-300)`,
    400: `var(--kg-${name}-400)`,
    500: `var(--kg-${name}-500)`,
    600: `var(--kg-${name}-600)`,
    700: `var(--kg-${name}-700)`,
    800: `var(--kg-${name}-800)`,
    900: `var(--kg-${name}-900)`,
    950: `var(--kg-${name}-950)`,
  });

export const colors = Object.freeze({
  primary: palette("primary"),
  secondary: palette("secondary"),
  accent: palette("accent"),
  earth: palette("earth"),
  neutral: palette("neutral"),
  white: "var(--kg-white)",
  semantic: Object.freeze({
    canvas: "var(--kg-color-canvas)",
    surface: "var(--kg-color-surface)",
    surfaceMuted: "var(--kg-color-surface-muted)",
    foreground: "var(--kg-color-foreground)",
    foregroundMuted: "var(--kg-color-foreground-muted)",
    border: "var(--kg-color-border)",
    focus: "var(--kg-color-focus)",
  }),
});
