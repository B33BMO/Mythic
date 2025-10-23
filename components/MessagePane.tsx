"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { fetchMessages } from "@/lib/zulip";
import DOMPurify from "dompurify";
import { Quote, Laugh, ThumbsUp, X, RefreshCw } from "lucide-react";
import EnhancedAvatar from "./EnhancedAvatar";

/* ──────────────────────
   HTML handling with image support (keep this section the same)
   ────────────────────── */
function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function isEscapedHtml(s: string) {
  return (
    s.includes("&lt;") &&
    /&lt;\/?(p|div|span|a|br|strong|em|ul|ol|li|blockquote|pre|code|table|tr|td|th|img|h[1-6])/i.test(s)
  );
}
function isHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}
function unescapeEntities(s: string) {
  const ta = document.createElement("textarea");
  ta.innerHTML = s;
  return ta.value;
}
function sanitize(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "div", "span", "a", "br", "strong", "b", "em", "i", "ul", "ol", "li", "blockquote",
      "pre", "code", "table", "thead", "tbody", "tr", "td", "th", "hr", "img", "h1", "h2", "h3", "h4", "h5", "h6",
    ],
    ALLOWED_ATTR: [
      "href", "title", "alt", "src", "colspan", "rowspan", "target", "rel", "aria-label", "role", "class",
      "width", "height", "style", "loading"
    ],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    USE_PROFILES: { html: true },
    ADD_ATTR: ['loading', 'decoding'],
  });
}

function processImageUrls(html: string): string {
  let processed = html;
  processed = processed.replace(/src="(\/[^"]*)"/g, 'src="https://zulip.cyburity.com$1"');
  processed = processed.replace(/src="https:\/\/zulip\.cyburity\.com\/user_uploads\/thumbnail\/([^"]+)\.png\/[^"]+"/g, 'src="https://zulip.cyburity.com/user_uploads/$1.png"');
  processed = processed.replace(/<img/g, '<img loading="lazy" decoding="async"');
  return processed;
}

function normalizeRendered(rendered?: string, raw?: string) {
  if (rendered && rendered.trim()) {
    const html = isEscapedHtml(rendered) ? unescapeEntities(rendered) : rendered;
    const sanitized = sanitize(html);
    return processImageUrls(sanitized);
  }
  if (raw && raw.trim()) {
    if (isEscapedHtml(raw)) {
      const sanitized = sanitize(unescapeEntities(raw));
      return processImageUrls(sanitized);
    }
    if (isHtml(raw)) {
      const sanitized = sanitize(raw);
      return processImageUrls(sanitized);
    }
  }
  const text = (raw || "").replace(/\r\n/g, "\n");
  return `<pre style="white-space:pre-wrap;margin:0">${escapeHtml(text)}</pre>`;
}

// Helper function to highlight search terms
function highlightSearch(text: string, query: string): string {
  if (!query.trim() || !text) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 text-black px-1 rounded">$1</mark>');
}

/* ──────────────────────
   Types
   ────────────────────── */
type ZulipMsg = {
  id: number;
  sender_full_name: string;
  sender_email: string;
  timestamp: number;
  topic?: string;
  rendered_content?: string;
  content?: string;
};

export default function MessagePane({
  narrow,
  searchQuery,
  onClearSearch,
  onQuote,
  refreshTrigger = 0
}: {
  narrow: any[];
  searchQuery?: string;
  onClearSearch?: () => void;
  onQuote: (quoted: string) => void;
  refreshTrigger?: number;
}) {
  const [msgs, setMsgs] = useState<ZulipMsg[]>([]);
  const [oldestId, setOldestId] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNew, setLoadingNew] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevNarrowRef = useRef<string>('');

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery?.trim()) return msgs;
    
    const query = searchQuery.toLowerCase();
    return msgs.filter(msg => 
      msg.content?.toLowerCase().includes(query) ||
      msg.sender_full_name?.toLowerCase().includes(query) ||
      msg.topic?.toLowerCase().includes(query) ||
      msg.rendered_content?.toLowerCase().includes(query)
    );
  }, [msgs, searchQuery]);

  // Load messages function with animations
  const loadMessages = useCallback(async (showLoading = false, animate = false) => {
    if (showLoading) setLoadingNew(true);
    if (animate) setAnimating(true);
    
    try {
      const { messages } = await fetchMessages(narrow, { anchor: "newest", before: 50, after: 0 });
      
      if (animate) {
        setMsgs([]);
        setTimeout(() => {
          setMsgs(messages);
          setOldestId(messages.length ? messages[0].id : null);
          
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            setAnimating(false);
          }, 300);
        }, 50);
      } else {
        setMsgs(messages);
        setOldestId(messages.length ? messages[0].id : null);
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setAnimating(false);
    } finally {
      if (showLoading) setLoadingNew(false);
    }
  }, [JSON.stringify(narrow)]);

  // Check if narrow changed for animation
  useEffect(() => {
    const currentNarrow = JSON.stringify(narrow);
    const narrowChanged = prevNarrowRef.current !== currentNarrow;
    prevNarrowRef.current = currentNarrow;

    if (narrowChanged) {
      console.log('Narrow changed, animating transition');
      loadMessages(false, true);
    } else {
      loadMessages();
    }
  }, [JSON.stringify(narrow)]);

  // Refresh when trigger changes (after sending a message)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Refresh trigger changed, loading messages with animation');
      const timer = setTimeout(() => {
        loadMessages(true, true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [refreshTrigger, loadMessages]);

  // Manual refresh function
  const handleManualRefresh = () => {
    console.log('Manual refresh triggered with animation');
    loadMessages(true, true);
  };

  /* Infinite scroll up */
  const onScroll = useCallback(async () => {
    const el = scrollerRef.current;
    if (!el || loadingOlder || !oldestId) return;
    if (el.scrollTop <= 40) {
      setLoadingOlder(true);
      const prevHeight = el.scrollHeight;
      const { messages } = await fetchMessages(narrow, {
        anchor: oldestId,
        before: 50,
        after: 0,
      }).catch(() => ({ messages: [] as ZulipMsg[] }));
      if (messages.length) {
        const dedup = messages.filter((m) => m.id < oldestId);
        
        setMsgs((cur) => {
          const newMsgs = [...dedup, ...cur];
          return newMsgs;
        });
        setOldestId(dedup.length ? dedup[0].id : oldestId);
        
        requestAnimationFrame(() => {
          const newHeight = el.scrollHeight;
          el.scrollTop = newHeight - prevHeight + el.scrollTop;
        });
      }
      setLoadingOlder(false);
    }
  }, [loadingOlder, oldestId, JSON.stringify(narrow)]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll as any);
  }, [onScroll]);

  // Handle image clicks for lightbox
  useEffect(() => {
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' && target.closest('.markdown')) {
        e.preventDefault();
        e.stopPropagation();
        const src = target.getAttribute('src');
        if (src) {
          let fullSizeSrc = src;
          if (src.includes('/thumbnail/')) {
            fullSizeSrc = src.replace('/thumbnail/', '/').split('/').slice(0, -1).join('/');
          }
          setLightboxImage(fullSizeSrc);
        }
      }
    };

    document.addEventListener('click', handleImageClick);
    return () => document.removeEventListener('click', handleImageClick);
  }, []);

  return (
    <>
      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 overflow-auto p-4 scroll-thin relative"
        style={{
          background: "radial-gradient(900px 600px at 50% -10%, rgba(255,255,255,.06) 0%, rgba(255,255,255,0) 60%)",
          borderRadius: "1rem",
        }}
      >
        {/* Search indicator */}
        {searchQuery && (
          <div className="mb-4 px-4 py-3 glass border border-accent/30 bg-accent/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-accent font-medium">Search:</span>
                <span className="text-white">"{searchQuery}"</span>
                <span className="text-zinc-400 text-sm">
                  ({filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''})
                </span>
              </div>
              <button 
                onClick={onClearSearch}
                className="p-1 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                title="Clear search"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={handleManualRefresh}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          title="Refresh messages"
          disabled={loadingNew || animating}
        >
          <RefreshCw size={16} className={(loadingNew || animating) ? "animate-spin" : ""} />
        </button>

        {/* Messages with staggered animation */}
        <div className={`transition-all duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}>
          {filteredMessages.map((m, index) => (
            <div
              key={m.id}
              className="glass px-4 py-3 mb-3 message-entry"
              style={{
                boxShadow: "inset 0 1px 0 0 rgba(255,255,255,.06)",
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-start gap-3">
                <EnhancedAvatar 
                  email={m.sender_email} 
                  name={m.sender_full_name || m.sender_email} 
                />
                <div className="flex-1 min-w-0">
                  {/* Header line */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="font-semibold tracking-tight"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightSearch(m.sender_full_name, searchQuery || '') 
                      }}
                    />
                    {m.topic && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 16%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                          color: "var(--text)",
                        }}
                        dangerouslySetInnerHTML={{ 
                          __html: highlightSearch(m.topic, searchQuery || '') 
                        }}
                      />
                    )}
                    <span className="ml-auto text-[11px]" style={{ color: "var(--muted)" }}>
                      {new Date(m.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>

                  {/* Content bubble */}
                  <div
                    className="mt-2 rounded-xl px-4 py-3"
                    style={{
                      background: "var(--panel)",
                      border: "1px solid var(--panel-strong)",
                    }}
                  >
                    <div
                      className="markdown text-[0.95rem] leading-6"
                      dangerouslySetInnerHTML={{
                        __html: searchQuery ? 
                          highlightSearch(normalizeRendered(m.rendered_content, m.content), searchQuery) :
                          normalizeRendered(m.rendered_content, m.content),
                      }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 text-xs mt-2" style={{ color: "var(--muted)" }}>
                    <button
                      className="inline-flex items-center gap-1 hover-scale"
                      style={{ transition: "color .15s" }}
                      onClick={() => onQuote(m.content || "")}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                    >
                      <Quote size={14} /> Reply
                    </button>
                    <button
                      className="inline-flex items-center gap-1 hover-scale"
                      style={{ transition: "color .15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                    >
                      <Laugh size={14} /> React
                    </button>
                    <button
                      className="inline-flex items-center gap-1 hover-scale"
                      style={{ transition: "color .15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                    >
                      <ThumbsUp size={14} /> +1
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div ref={bottomRef} />
        
        {/* Loading indicators with animations */}
        {loadingNew && (
          <div className="text-center text-xs py-2 animate-pulse" style={{ color: "var(--muted)" }}>
            <div className="flex items-center justify-center gap-2">
              <RefreshCw size={12} className="animate-spin" />
              Loading new messages...
            </div>
          </div>
        )}
        {loadingOlder && (
          <div className="text-center text-xs py-2 animate-pulse" style={{ color: "var(--muted)" }}>
            <div className="flex items-center justify-center gap-2">
              <RefreshCw size={12} className="animate-spin" />
              Loading older messages...
            </div>
          </div>
        )}
        
        {/* Animation overlay */}
        {animating && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-white text-sm">
              <RefreshCw size={16} className="animate-spin" />
              Loading messages...
            </div>
          </div>
        )}
      </div>

      {/* Lightbox modal with animation */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 cursor-pointer animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white animate-scale-in"
            onClick={() => setLightboxImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Enlarged view" 
            className="max-w-[90%] max-h-[90%] object-contain rounded-lg animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      {/* Add CSS animations to globals.css */}
      <style jsx>{`
        .message-entry {
          animation: fadeInUp 0.5s ease-out both;
        }
        
        .hover-scale:hover {
          transform: scale(1.05);
          transition: transform 0.15s ease;
        }
      `}</style>
    </>
  );
}
