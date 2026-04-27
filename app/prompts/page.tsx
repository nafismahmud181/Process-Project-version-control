import Link from "next/link";
import { PromptLibrary } from "@/components/PromptLibrary";

export default function PromptsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Prompt library
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Auto-populated from uploaded process versions. Click any card to view full detail and version history.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            ← Versions
          </Link>
        </div>
        <PromptLibrary />
      </div>
    </div>
  );
}