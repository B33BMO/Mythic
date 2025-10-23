"use client";
import { useEffect, useMemo, useState } from "react";
import { listUsers, realmPresence } from "@/lib/zulip";
import PresenceDot from "./PresenceDot";
import EnhancedAvatar from "./EnhancedAvatar";
export default function RightSidebar({ onOpenDM }: { onOpenDM: (u: { id: number; email: string }) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [presence, setPresence] = useState<Record<string, any>>({});

  useEffect(() => {
    listUsers().then(setUsers).catch(console.error);
    realmPresence().then((d) => setPresence(d.presences || {})).catch(() => {});
  }, []);

  function statusFor(user: any): "active" | "idle" | "offline" {
    const p = presence[user.email];
    if (!p || !p.aggregated) return "offline";
    return p.aggregated.status;
  }

  const groups = useMemo(() => {
    const g = { active: [] as any[], idle: [] as any[], offline: [] as any[] };
    for (const u of users.filter((u) => !u.is_bot)) {
      g[statusFor(u) || "offline"].push(u);
    }
    return g;
  }, [users, presence]);

  // Define Section component INSIDE RightSidebar with proper export
  const Section = ({ title, arr }: { title: string; arr: any[] }) => (
    <section>
      <div className="sticky top-0 z-10 backdrop-blur bg-transparent text-sm uppercase tracking-wide text-zinc-400 px-1 py-1">
        {title}
      </div>
      <div className="space-y-1">
        {arr.map((u) => (
          <button
            key={u.user_id}
            onClick={() => onOpenDM({ id: u.user_id, email: u.email })}
            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5"
          >
            <EnhancedAvatar email={u.email} name={u.full_name} />
            <div className="flex-1 text-left">
              <div className="text-sm">{u.full_name}</div>
              <div className="text-xs text-zinc-400">{u.email}</div>
            </div>
            <PresenceDot status={statusFor(u)} />
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <aside className="glass w-80 h-full p-3 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-3">
        <Section title="Active" arr={groups.active} />
        <Section title="Away" arr={groups.idle} />
        <Section title="Offline" arr={groups.offline} />
      </div>
    </aside>
  );
}
