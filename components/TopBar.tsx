"use client";
import { useEffect, useMemo, useState } from "react";
import { getAppVersion } from "@/lib/appInfo";
import { getSelf } from "@/lib/zulip";
import VersionModal from "./VersionModal";
import EnhancedAvatar from "./EnhancedAvatar";
import { LogOut, Settings, BookOpen, Search, Sun, Moon, Monitor } from "lucide-react";

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
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

  useEffect(() => { 
    getAppVersion().then(setVersion); 
    
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('zulip-theme') as 'dark' | 'light' | 'system';
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  useEffect(() => { 
    getSelf().then(setMe).catch(()=>{}); 
  }, []);

  const applyTheme = (newTheme: 'dark' | 'light' | 'system') => {
    const root = document.documentElement;
    
    if (newTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('light-mode', !systemPrefersDark);
      root.classList.toggle('dark-mode', systemPrefersDark);
    } else {
      root.classList.toggle('light-mode', newTheme === 'light');
      root.classList.toggle('dark-mode', newTheme === 'dark');
    }
    
    // Save to localStorage
    localStorage.setItem('zulip-theme', newTheme);
  };

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

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
      <header className="relative z-[200] flex items-center justify-between px-4 py-3 glass border-b border-white/10 dark-mode:border-zinc-300/20">
        {/* left: logo + version */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 dark-mode:bg-black/10 dark-mode:border-zinc-300/20">
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
                className="text-xs text-zinc-400 hover:text-zinc-200 dark-mode:text-zinc-500 dark-mode:hover:text-zinc-700 underline decoration-dotted text-left"
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
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark-mode:text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search streams, topics, messages…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none focus:bg-white/10 focus:border-white/20 transition-colors dark-mode:bg-black/5 dark-mode:border-zinc-300/20 dark-mode:focus:bg-black/10 dark-mode:focus:border-zinc-400/30"
              />
            </div>
          </form>
        </div>

        {/* right: user avatar + menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group dark-mode:hover:bg-black/10"
          >
            <div className="flex flex-col items-end hidden sm:flex">
              <div className="text-sm font-medium text-zinc-200 group-hover:text-white dark-mode:text-zinc-700 dark-mode:group-hover:text-zinc-900">
                {me?.full_name || "Loading…"}
              </div>
              <div className="text-xs text-zinc-400 truncate max-w-[120px] dark-mode:text-zinc-500">
                {me?.email || ""}
              </div>
            </div>
            
            <div className="border-2 border-white/20 group-hover:border-white/30 transition-colors rounded-full dark-mode:border-zinc-300/20 dark-mode:group-hover:border-zinc-400/30">
              <EnhancedAvatar 
                email={me?.email} 
                name={me?.full_name || me?.email || "User"} 
                size={40}
              />
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-xl rounded-xl p-2 z-50 border border-white/20 shadow-2xl dark-mode:bg-white/95 dark-mode:border-zinc-300/20">
              {/* User info */}
              <div className="px-3 py-2 border-b border-white/20 dark-mode:border-zinc-300/20">
                <div className="text-sm font-medium text-white dark-mode:text-zinc-900">{me?.full_name}</div>
                <div className="text-xs text-zinc-300 truncate dark-mode:text-zinc-600">{me?.email}</div>
              </div>
              
              {/* Theme selector */}
              <div className="px-3 py-2 border-b border-white/20 dark-mode:border-zinc-300/20">
                <div className="text-xs font-medium text-zinc-400 mb-2 dark-mode:text-zinc-500">Theme</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
                      theme === 'dark' 
                        ? 'bg-accent text-white' 
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 dark-mode:bg-black/5 dark-mode:hover:bg-black/10 dark-mode:text-zinc-600'
                    }`}
                  >
                    <Moon size={12} />
                    Dark
                  </button>
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
                      theme === 'light' 
                        ? 'bg-accent text-white' 
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 dark-mode:bg-black/5 dark-mode:hover:bg-black/10 dark-mode:text-zinc-600'
                    }`}
                  >
                    <Sun size={12} />
                    Light
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
                      theme === 'system' 
                        ? 'bg-accent text-black' 
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 dark-mode:bg-black/5 dark-mode:hover:bg-black/10 dark-mode:text-zinc-600'
                    }`}
                  >
                    <Monitor size={12} />
                    System
                  </button>
                </div>
              </div>
              
              {/* Menu items */}
              <div className="py-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/15 transition-colors text-sm text-white dark-mode:hover:bg-black/15 dark-mode:text-zinc-900">
                  <Settings size={16} />
                  Settings
                </button>
                <button 
                  onClick={() => setShowNotes(true)} 
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/15 transition-colors text-sm text-white dark-mode:hover:bg-black/15 dark-mode:text-zinc-900"
                >
                  <BookOpen size={16} />
                  Release Notes
                </button>
              </div>
              
              <div className="h-px my-1 bg-white/20 dark-mode:bg-zinc-300/20" />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/30 text-red-300 transition-colors text-sm dark-mode:hover:bg-red-500/20 dark-mode:text-red-600"
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
