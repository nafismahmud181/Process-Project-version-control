import Link from "next/link";
import { VersionPanel } from "@/components/VersionPanel";

export default function Home() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">
              Process version panel
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Upload, inspect, and compare process configuration files.
            </p>
          </div>
          <Link
            href="/prompts"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Prompt library →
          </Link>
        </div>
        <VersionPanel />
      </div>
    </div>
  );
}