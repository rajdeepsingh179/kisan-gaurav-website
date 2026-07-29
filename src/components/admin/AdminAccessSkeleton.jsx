import BrandMark from "../brand/BrandMark";

export default function AdminAccessSkeleton({ label = "Checking secure access" }) {
  return (
    <div className="admin-gate admin-access-skeleton" aria-busy="true" aria-label={label}>
      <BrandMark className="admin-brand-mark admin-brand-mark--gate" priority sizes="52px" />
      <div className="admin-skeleton is-title" />
      <div className="admin-skeleton is-copy" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
