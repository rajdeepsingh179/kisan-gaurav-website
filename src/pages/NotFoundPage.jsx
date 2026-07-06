import { Link } from "react-router-dom";

import useDocumentTitle from "../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <Link className="mt-6 inline-block underline underline-offset-4" to="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
