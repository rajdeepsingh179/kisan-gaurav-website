import { Link } from "react-router-dom";

import { commonContent } from "../data/commonContent";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLanguage from "../hooks/useLanguage";

export default function NotFoundPage() {
  const { language } = useLanguage();
  const content = commonContent[language].notFound;
  useDocumentTitle(content.title);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {content.title}
        </h1>
        <Link className="mt-6 inline-block underline underline-offset-4" to="/">
          {content.returnHome}
        </Link>
      </div>
    </main>
  );
}
