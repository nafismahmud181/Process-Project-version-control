import { PromptLibrary } from "@/components/PromptLibrary";

export default function PromptsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">
            Prompt library
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            Auto-populated from uploaded process versions. Tracks field and rules changes per key.
          </p>
        </div>
        <PromptLibrary />
      </div>
    </div>
  );
}