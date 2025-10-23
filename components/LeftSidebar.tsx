"use client";
import { useEffect, useState } from "react";
import { listStreams, listTopics, recentDMs, getUnreadCounts } from "@/lib/zulip";
import PresenceDot from "./PresenceDot";
import EnhancedAvatar from "./EnhancedAvatar";
import { ChevronLeft, Bell, MessageCircle } from "lucide-react";

type Stream = { stream_id: number; name: string };
type UnreadCounts = {
  streams: Map<number, number>; // stream_id -> unread_count
  dms: Map<string, number>; // email -> unread_count
};

export default function LeftSidebar(props: {
  onOpenDM: (u: { id: number; email: string }) => void;
  onSelectStream: (streamId: number, streamName: string) => void;
  onSelectTopic: (topic: string | null) => void;
  onBackToStreams: () => void;
  selectedStreamId?: number;
  selectedStreamName?: string;
}) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [dms, setDms] = useState<any[]>([]);
  const [showingTopicsFor, setShowingTopicsFor] = useState<Stream | null>(null);
  const [topics, setTopics] = useState<{ name: string; max_id: number }[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    streams: new Map(),
    dms: new Map()
  });

  // Load streams and DMs
  useEffect(() => { 
    listStreams().then(setStreams).catch(console.error); 
  }, []);

  useEffect(() => { 
    recentDMs().then(dms => {
      // Sort DMs by most recent first - use timestamp or fallback to ID
      const sortedDMs = dms.sort((a, b) => {
        const timeA = a.timestamp || a.id || 0; // Fallback to ID if no timestamp
        const timeB = b.timestamp || b.id || 0;
        return timeB - timeA; // Most recent first
      });
      setDms(sortedDMs);
    }).catch(() => setDms([])); 
  }, []);

  // Load unread counts periodically
  useEffect(() => {
    const loadUnreadCounts = async () => {
      try {
        const counts = await getUnreadCounts();
        setUnreadCounts(counts);
      } catch (error) {
        console.error('Failed to load unread counts:', error);
      }
    };

    // Load immediately
    loadUnreadCounts();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(loadUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // sync external selection
  useEffect(() => {
    if (props.selectedStreamId && props.selectedStreamName) {
      const s: Stream = { stream_id: props.selectedStreamId, name: props.selectedStreamName };
      setShowingTopicsFor(s);
      listTopics(s.stream_id).then(setTopics).catch(() => setTopics([]));
    } else {
      setShowingTopicsFor(null);
      setTopics([]);
    }
  }, [props.selectedStreamId, props.selectedStreamName]);

  function openStream(s: Stream) {
    props.onSelectStream(s.stream_id, s.name);
    setShowingTopicsFor(s);
    setTopics([]);
    listTopics(s.stream_id).then(setTopics).catch(() => setTopics([]));
  }

  function backToStreams() {
    setShowingTopicsFor(null);
    setTopics([]);
    props.onBackToStreams();
  }

  // Get unread count for a stream
  const getStreamUnreadCount = (streamId: number) => {
    return unreadCounts.streams.get(streamId) || 0;
  };

  // Get unread count for a DM
  const getDMUnreadCount = (email: string) => {
    return unreadCounts.dms.get(email) || 0;
  };

  // Calculate total unread count
  const totalUnread = Array.from(unreadCounts.streams.values()).reduce((a, b) => a + b, 0) +
                     Array.from(unreadCounts.dms.values()).reduce((a, b) => a + b, 0);

  return (
    <aside className="glass w-80 h-full p-3 flex flex-col overflow-hidden gap-3">
      {/* Header with total notifications */}
      <div className="flex items-center justify-between">
        <div className="text-sm uppercase tracking-wide text-zinc-400">Recent DMs</div>
        {totalUnread > 0 && (
          <div className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
            <Bell size={12} />
            <span>{totalUnread}</span>
          </div>
        )}
      </div>

      {/* DMs */}
      <div className="flex-none max-h-56 overflow-auto pr-1 space-y-1">
        {dms.map((dm) => {
          const unreadCount = getDMUnreadCount(dm.sender_email);
          return (
            <button
              key={dm.id}
              onClick={() => props.onOpenDM({ id: dm.sender_id, email: dm.sender_email })}
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5 relative group"
            >
              <EnhancedAvatar email={dm.sender_email} name={dm.sender_full_name || "User"} />
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm truncate">{dm.sender_full_name}</div>
                <div
                  className="text-xs text-zinc-400 line-clamp-1 truncate"
                  dangerouslySetInnerHTML={{ __html: dm.rendered_content || "" }}
                />
              </div>
              
              {/* Unread badge for DMs */}
              {unreadCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                  <PresenceDot />
                </div>
              )}
              {unreadCount === 0 && <PresenceDot />}
            </button>
          );
        })}
      </div>

      {/* Streams / Topics Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm uppercase tracking-wide text-zinc-400">
          {!showingTopicsFor ? (
            "Streams"
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={backToStreams} className="rounded-md hover:bg-white/5 p-1 -ml-1" title="Back">
                <ChevronLeft size={16} />
              </button>
              Topics · <span className="text-zinc-300">#{showingTopicsFor.name}</span>
            </div>
          )}
        </div>
        
        {/* Streams unread count */}
        {!showingTopicsFor && (
          <div className="text-xs text-zinc-500">
            {Array.from(unreadCounts.streams.values()).reduce((a, b) => a + b, 0)} unread
          </div>
        )}
      </div>

      {/* Streams / Topics List */}
      <div className="flex-1 min-h-0 overflow-auto pr-1">
        {!showingTopicsFor ? (
          <div className="space-y-1">
            {streams.map((s) => {
              const unreadCount = getStreamUnreadCount(s.stream_id);
              return (
                <button
                  key={s.stream_id}
                  onClick={() => openStream(s)}
                  className="w-full text-left rounded-md px-2 py-1.5 hover:bg-white/5 relative group flex items-center justify-between"
                >
                  <span className="truncate">#{s.name}</span>
                  
                  {/* Stream unread badge */}
                  {unreadCount > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <MessageCircle size={12} className="text-zinc-400" />
                      <div className="bg-blue-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => props.onSelectTopic(null)}
              className="w-full text-left rounded-md px-2 py-1.5 hover:bg-white/5"
            >
              All topics
            </button>
            {topics.map((t) => (
              <button
                key={t.name}
                onClick={() => props.onSelectTopic(t.name)}
                className="w-full text-left rounded-md px-2 py-1.5 hover:bg-white/5"
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
