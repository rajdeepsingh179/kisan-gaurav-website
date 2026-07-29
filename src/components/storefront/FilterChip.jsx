export default function FilterChip({ active, className = "", children, ...props }) {
  return (
    <button
      className={`filter-chip${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
      type="button"
      aria-pressed={active === undefined ? undefined : active}
      {...props}
    >
      {children}
    </button>
  );
}
