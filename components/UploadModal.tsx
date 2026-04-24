"use client";

import { useState, useEffect } from "react";

interface DetectedProcess {
  processId: string;
  processName: string;
  versionNumber: number;
}

interface UploadModalProps {
  fileName: string;
  detectedProcess: DetectedProcess | null;
  onConfirm: (label: string, note: string) => void;
  onCancel: () => void;
}

export function UploadModal({
  fileName,
  detectedProcess,
  onConfirm,
  onCancel,
}: UploadModalProps) {
  const isNewVersion =
    detectedProcess !== null && detectedProcess.versionNumber > 1;

  const defaultLabel = detectedProcess
    ? isNewVersion
      ? `${detectedProcess.processName} v${detectedProcess.versionNumber}`
      : detectedProcess.processName
    : fileName.replace(/\.json$/i, "").replace(/[_-]+/g, " ");

  const [label, setLabel] = useState(defaultLabel);
  const [note, setNote] = useState("");

  useEffect(() => {
    setLabel(defaultLabel);
  }, [defaultLabel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-base font-medium text-gray-900 dark:text-gray-100">
          Save new version
        </h2>

        {/* Version detection notice */}
        {detectedProcess && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2.5 text-sm ${
              isNewVersion
                ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            }`}
          >
            {isNewVersion ? (
              <>
                Detected as{" "}
                <span className="font-medium">
                  v{detectedProcess.versionNumber}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {detectedProcess.processName}
                </span>
              </>
            ) : (
              <>
                New process:{" "}
                <span className="font-medium">
                  {detectedProcess.processName}
                </span>
              </>
            )}
          </div>
        )}

        <div className="mb-3">
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
            Label
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
            Notes{" "}
            <span className="text-gray-400 dark:text-gray-600">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What changed in this version?"
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(label, note)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Save version
          </button>
        </div>
      </div>
    </div>
  );
}