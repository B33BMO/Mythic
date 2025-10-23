"use client";
import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import MessagePane from "@/components/MessagePane";
import Composer from "@/components/Composer";
import LoginModal from "@/components/LoginModal";
import { syncCredentialsWithMainProcess } from "@/lib/credentialSync";
import { startTimeGradientUpdater } from "@/lib/timeGradient";
import { ChevronLeft, ChevronRight, Users, MessageSquare } from "lucide-react";

export default function Home() {
  const [mode, setMode] = useState<"stream" | "private">("stream");
  const [stream, setStream] = useState<{ id: number | null; name: string | null }>({ id: null, name: null });
  const [topic, setTopic] = useState<string | null>(null);
  const [pm, setPm] = useState<{ userId: number | null; email: string | null }>({ userId: null, email: null });
  const [anchor, setAnchor] = useState<"newest" | number>("newest");
  const [quotedMessage, setQuotedMessage] = useState<string | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Initialize time gradient system
  useEffect(() => {
    const cleanup = startTimeGradientUpdater();
    return cleanup;
  }, []);

  // Check if user is authenticated on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const stored = localStorage.getItem('zulipCredentials');
        const hasEnvVars = process.env.ZULIP_EMAIL && process.env.ZULIP_API_KEY && process.env.ZULIP_REALM_URL;
        const authenticated = !!stored || !!hasEnvVars;
        setIsAuthenticated(authenticated);
        setShowLogin(!authenticated);
        
        // Sync credentials with main process if authenticated
        if (authenticated) {
          await syncCredentialsWithMainProcess();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setShowLogin(true);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => setAnchor("newest"), [mode, stream.id, topic, pm.userId]);

  const narrow = useMemo(() => {
    if (mode === "private" && pm.email) return [{ operator: "pm-with", operand: pm.email }];
    if (stream.name) {
      return topic
        ? [{ operator: "stream", operand: stream.name }, { operator: "topic", operand: topic }]
        : [{ operator: "stream", operand: stream.name }];
    }
    return [];
  }, [mode, stream.name, topic, pm.email]);

  // Calculate dynamic widths based on sidebar states
  const leftSidebarWidth = leftSidebarOpen ? '20rem' : '0rem';
  const rightSidebarWidth = rightSidebarOpen ? '20rem' : '0rem';
  const mainContentWidth = `calc(100vw - ${leftSidebarOpen ? '20rem' : '0rem'} - ${rightSidebarOpen ? '20rem' : '0rem'} - 3rem)`; // 3rem for gaps

  async function openDM(user: { id: number; email: string }) {
    setMode("private");
    setPm({ userId: user.id, email: user.email });
    setQuotedMessage(undefined);
    setSearchQuery(''); // Clear search when switching contexts
  }

  function selectStream(id: number, name: string) {
    setMode("stream");
    setStream({ id, name });
    setTopic(null);
    setQuotedMessage(undefined);
    setSearchQuery(''); // Clear search when switching contexts
  }

  function handleQuote(messageContent: string) {
    setQuotedMessage(messageContent);
    setTimeout(() => {
      document.querySelector('textarea')?.focus();
    }, 100);
  }

  function handleMessageSent() {
    console.log('Message sent, triggering refresh. Current trigger:', refreshTrigger);
    setAnchor("newest");
    setQuotedMessage(undefined);
    setRefreshTrigger(prev => {
      const newTrigger = prev + 1;
      console.log('New refresh trigger:', newTrigger);
      return newTrigger;
    });
  }

  async function handleLoginSuccess() {
    setIsAuthenticated(true);
    setShowLogin(false);
    
    // Sync credentials with main process
    await syncCredentialsWithMainProcess();
    
    // Small delay to ensure credentials are synced before reloading
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
  }

  function clearSearch() {
    setSearchQuery('');
  }

  function toggleLeftSidebar() {
    setLeftSidebarOpen(!leftSidebarOpen);
  }

  function toggleRightSidebar() {
    setRightSidebarOpen(!rightSidebarOpen);
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Mythic</h1>
          <button 
            onClick={() => setShowLogin(true)}
            className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            Login to Zulip
          </button>
        </div>
        
        <LoginModal 
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col gap-3 p-3">
      <TopBar onSearch={handleSearch} />

      <div className="flex-1 min-h-0 flex gap-3">
        {/* Left Sidebar with toggle button */}
        <div className="flex">
          <div 
            className={`transition-all duration-300 overflow-hidden ${leftSidebarOpen ? 'w-80' : 'w-0'}`}
          >
            <LeftSidebar
              selectedStreamId={stream.id ?? undefined}
              selectedStreamName={stream.name ?? undefined}
              onOpenDM={openDM}
              onSelectStream={selectStream}
              onSelectTopic={setTopic}
              onBackToStreams={() => {
                setStream({ id: null, name: null });
                setTopic(null);
                setQuotedMessage(undefined);
                setSearchQuery(''); // Clear search when going back
              }}
            />
          </div>
          
          {/* Left sidebar toggle button */}
          <button
            onClick={toggleLeftSidebar}
            className="w-8 h-8 self-center -ml-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-colors z-10"
            title={leftSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {leftSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Main content area - scales dynamically */}
        <div 
          className="flex-1 min-w-0 flex flex-col gap-3 transition-all duration-300"
          style={{ width: mainContentWidth }}
        >
          <MessagePane
            narrow={narrow}
            searchQuery={searchQuery}
            onClearSearch={clearSearch}
            onQuote={handleQuote}
            refreshTrigger={refreshTrigger}
          />
          <Composer
            mode={mode}
            streamName={stream.name ?? undefined}
            topic={topic ?? undefined}
            pmUserEmail={pm.email ?? undefined}
            quotedMessage={quotedMessage}
            onSent={handleMessageSent}
            onSpoiler={() => {}}
          />
        </div>

        {/* Right Sidebar with toggle button */}
        <div className="flex">
          {/* Right sidebar toggle button */}
          <button
            onClick={toggleRightSidebar}
            className="w-8 h-8 self-center -mr-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-colors z-10"
            title={rightSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {rightSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          
          <div 
            className={`transition-all duration-300 overflow-hidden ${rightSidebarOpen ? 'w-80' : 'w-0'}`}
          >
            <RightSidebar onOpenDM={openDM} />
          </div>
        </div>
      </div>

      {/* Sidebar toggle buttons for when both are collapsed */}
      {!leftSidebarOpen && !rightSidebarOpen && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          <button
            onClick={toggleLeftSidebar}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-2 transition-colors"
            title="Show left sidebar"
          >
            <MessageSquare size={16} />
            Streams
          </button>
          <button
            onClick={toggleRightSidebar}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-2 transition-colors"
            title="Show right sidebar"
          >
            <Users size={16} />
            Users
          </button>
        </div>
      )}

      <LoginModal 
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
