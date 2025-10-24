"use client";
import { useEffect, useMemo, useState } from "react";
import { getAppVersion } from "@/lib/appInfo";
import { getSelf } from "@/lib/zulip";
import VersionModal from "./VersionModal";
import EnhancedAvatar from "./EnhancedAvatar";
import { LogOut, Settings, BookOpen, Search } from "lucide-react";

export default function TopBar({
  onSearch,
}: {
  onSearch: (q: string) => void;
}) {
  const [version, setVersion] = useState("0.0.0");
  const [showNotes, setShowNotes] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => { 
    getAppVersion().then(setVersion); 
  }, []);

  useEffect(() => { 
    getSelf().then(setMe).catch(()=>{}); 
  }, []);

  const notes = useMemo(
    () => [
      { version, date: new Date().toLocaleDateString(), items: [
        "Initial Electron + Next.js client shell.",
        "DM/Streams → Topics toggle in left sidebar with AVATARS BITCH!",
        "Presence-based user list with sticky section headers.",
        "Composer with bold/italic/code/quote/lists/spoiler.",
        "Images work now! Changed theme around a bit.",
        "File uploads now function, dragging and selecting.",
        "__________________",
        "TO-DO: Normal login system, windows notifications, reactions, MORE"
      ]},
    ],
    [version]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) onSearch(term);
  }

  const handleLogout = () => {
    localStorage.removeItem('zulipCredentials');
    if (typeof process !== 'undefined') {
      delete process.env.ZULIP_EMAIL;
      delete process.env.ZULIP_API_KEY;
      delete process.env.ZULIP_REALM_URL;
    }
    window.location.reload();
  };

  return (
    <>
      <header className="relative z-[200] flex items-center justify-between px-4 py-3 glass border-b border-white/10">
        {/* left: logo + version */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10">
              <img 
                src="./logo.png" 
                alt="Mythic"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-full h-full bg-gradient-to-br from-accent to-accent/70 grid place-items-center">
                <span className="text-lg font-bold text-black tracking-tighter">MZ</span>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-lg font-bold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
                Mythic Zulip
              </div>
              <button
                onClick={() => setShowNotes(true)}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline decoration-dotted text-left"
                title="View release notes"
              >
                v{version}
              </button>
            </div>
          </div>
        </div>

        {/* center: search */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
          <form onSubmit={submit} className="w-full">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search streams, topics, messages…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none focus:bg-white/10 focus:border-white/20 transition-colors"
              />
            </div>
          </form>
        </div>

        {/* right: user avatar + menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group"
          >
            <div className="flex flex-col items-end hidden sm:flex">
              <div className="text-sm font-medium text-zinc-200 group-hover:text-white">
                {me?.full_name || "Loading…"}
              </div>
              <div className="text-xs text-zinc-400 truncate max-w-[120px]">
                {me?.email || ""}
              </div>
            </div>
            
            <div className="border-2 border-white/20 group-hover:border-white/30 transition-colors rounded-full">
              <EnhancedAvatar 
                name={""} 
                size={40}
              />
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-xl rounded-xl p-2 z-50 border border-white/20 shadow-2xl">
              {/* User info */}
              <div className="px-3 py-2 border-b border-white/20">
                <div className="text-sm font-medium text-white">{me?.full_name}</div>
                <div className="text-xs text-zinc-300 truncate">{me?.email}</div>
              </div>
              
              {/* Menu items */}
              <div className="py-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/15 transition-colors text-sm text-white">
                  <Settings size={16} />
                  Settings
                </button>
                <button 
                  onClick={() => setShowNotes(true)} 
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/15 transition-colors text-sm text-white"
                >
                  <BookOpen size={16} />
                  Release Notes
                </button>
              </div>
              
              <div className="h-px my-1 bg-white/20" />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/30 text-red-300 transition-colors text-sm"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <VersionModal
        open={showNotes}
        version={version}
        notes={notes}
        onClose={() => setShowNotes(false)}
      />
    </>
  );
}
