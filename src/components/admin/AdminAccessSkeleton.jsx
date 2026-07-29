export default function AdminAccessSkeleton({ label = "Checking secure access" }) {
  return (
    <div className="admin-gate admin-access-skeleton" aria-busy="true" aria-label={label}>
      <div className="admin-skeleton is-logo" />
      <div className="admin-skeleton is-title" />
      <div className="admin-skeleton is-copy" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
