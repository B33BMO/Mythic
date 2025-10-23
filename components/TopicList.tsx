"use client";
import { useEffect, useState } from "react";
import { listTopics } from "@/lib/zulip";

export default function TopicList({
  streamId,
  onSelectTopic,
  selected
}:{ streamId:number|null; onSelectTopic:(t:string|null)=>void; selected:string|null }) {
  const [topics, setTopics] = useState<{name:string; max_id:number}[]>([]);
  useEffect(() => {
    if (streamId) listTopics(streamId).then(setTopics).catch(() => setTopics([]));
    else setTopics([]);
  }, [streamId]);

  return (
    <div className="glass w-72 h-full p-3 overflow-auto">
      <div className="text-sm uppercase tracking-wide text-zinc-400 px-1">Topics</div>
      <button
        className={`w-full text-left rounded-md px-2 py-1.5 hover:bg-white/5 mt-2 ${selected===null?"bg-white/10":""}`}
        onClick={() => onSelectTopic(null)}>
        All topics
      </button>
      {topics.map(t => (
        <button key={t.name}
          onClick={() => onSelectTopic(t.name)}
          className={`w-full text-left rounded-md px-2 py-1.5 hover:bg-white/5 mt-1
            ${selected===t.name ? "bg-white/10" : ""}`}>
          {t.name}
        </button>
      ))}
    </div>
  );
}
