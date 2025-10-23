"use client";
export default function VersionModal({
  open,
  version,
  notes,
  onClose,
}: {
  open: boolean;
  version: string;
  notes: { version?: string; date?: string; items: string[] }[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass w-[680px] max-h-[70vh] overflow-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Release Notes</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md hover:bg-white/10">Close</button>
        </div>
        <div className="text-sm text-zinc-400 mb-2">App version: <span className="text-zinc-200">{version}</span></div>
        <div className="space-y-4">
          {notes.map((n, i) => (
            <div key={i} className="rounded-lg border border-white/10 p-3">
              <div className="text-sm text-zinc-300 mb-1">
                {n.version ? `v${n.version}` : "Unversioned"} {n.date && <span className="text-zinc-500">· {n.date}</span>}
              </div>
              <ul className="list-disc pl-5 text-zinc-200">
                {n.items.map((it, j) => <li key={j}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
