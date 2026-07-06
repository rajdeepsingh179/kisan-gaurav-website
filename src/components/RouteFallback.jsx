export default function RouteFallback() {
  return (
    <div
      className="grid min-h-screen place-items-center px-4 text-sm text-foreground-muted"
      role="status"
      aria-live="polite"
    >
      Loading…
    </div>
  );
}
