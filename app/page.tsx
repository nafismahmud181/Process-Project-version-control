import { VersionPanel } from "@/components/VersionPanel";

export default function Home() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">
            Process version panel
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            Upload, inspect, and compare process configuration files.
          </p>
        </div>
        <VersionPanel />
      </div>
    </div>
  );
}
