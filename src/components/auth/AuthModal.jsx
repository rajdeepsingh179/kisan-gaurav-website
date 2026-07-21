import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "../ui";

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function FormField({ autoComplete, label, name, type = "text" }) {
  const inputId = useId();

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-foreground" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="min-h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-foreground shadow-soft outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
        id={inputId}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.86A6 6 0 0 1 6.07 12c0-.65.11-1.28.32-1.86V7.52H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.48l3.34-2.62Z" />
      <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.95 5.52l3.34 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
    </svg>
  );
}

export function GoogleButton({ label }) {
  return (
    <Button className="w-full" variant="secondary" type="button">
      <GoogleIcon />
      {label}
    </Button>
  );
}

export function FormDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium uppercase tracking-wider text-foreground-muted">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export default function AuthModal({ children, description, isOpen, onClose, title }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector(focusableSelector)?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusableElements = [...dialogRef.current.querySelectorAll(focusableSelector)];
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <m.div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-primary-950/55 p-4 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <m.section
            ref={dialogRef}
            className="relative my-auto w-full max-w-md rounded-card border border-primary-100 bg-surface p-5 shadow-lifted sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <button
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-control text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
              type="button"
              aria-label={`Close ${title}`}
              onClick={onClose}
            >
              <X aria-hidden="true" className="size-5" />
            </button>

            <div className="mb-6 pr-10">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary-700">
                Kisan Gaurav
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground" id={titleId}>
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-foreground-muted" id={descriptionId}>
                {description}
              </p>
            </div>

            {children}
          </m.section>
        </m.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
