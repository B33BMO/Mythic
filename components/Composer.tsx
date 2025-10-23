"use client";
import { useRef, useState, useEffect } from "react";
import { sendMessage, uploadFile } from "@/lib/zulip";
import { Bold, Italic, Quote, List, ListOrdered, Code, Image as Img, EyeOff, X, Paperclip } from "lucide-react";

export default function Composer({
  mode,
  streamName,
  topic,
  pmUserEmail,
  onSent,
  onSpoiler,
  quotedMessage
}:{
  mode: "stream"|"private";
  streamName?: string | null;
  topic?: string | null;
  pmUserEmail?: string | null;
  onSent: () => void;
  onSpoiler: (wrap: (sel:string)=>string) => void;
  quotedMessage?: string;
}) {
  const [val, setVal] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; filename: string }[]>([]);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with quoted message if provided
  useEffect(() => {
    if (quotedMessage && !val.includes(quotedMessage)) {
      const quoteText = `> ${quotedMessage.replace(/\n/g, '\n> ')}\n\n`;
      setVal(prev => quoteText + prev);
      ta.current?.focus();
    }
  }, [quotedMessage]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (const file of Array.from(files)) {
      try {
        // Check file size (Zulip typically has limits)
        if (file.size > 25 * 1024 * 1024) { // 25MB limit
          alert(`File ${file.name} is too large. Maximum size is 25MB.`);
          continue;
        }

        const result = await uploadFile(file);
        
        // Use proper Zulip markdown format: [{filename}]({url})
        const markdown = `[${result.filename}](${result.url})`;
        setAttachments(prev => [...prev, { 
          name: file.name, 
          url: result.url, 
          filename: result.filename 
        }]);
        setVal(prev => prev + (prev.endsWith('\n') ? '' : '\n') + markdown + '\n');
        
      } catch (error) {
        console.error('Upload failed:', error);
        // Fix error type
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to upload ${file.name}: ${errorMessage}`);
      }
    }
    
    setUploading(false);
    if (event.target) {
      event.target.value = ''; // Reset file input
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    // Remove the markdown link from the message text
    const attachment = attachments[index];
    const markdown = `[${attachment.filename}](${attachment.url})`;
    setVal(prev => prev.replace(markdown, '').replace(/\n\n+/g, '\n'));
  };

  function wrap(before: string, after?: string) {
    const el = ta.current!;
    const [start, end] = [el.selectionStart, el.selectionEnd]; // Rename 'e' to 'end'
    const sel = val.slice(start, end);
    const rep = before + sel + (after ?? before);
    setVal(val.slice(0, start) + rep + val.slice(end));
    el.focus();
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + rep.length;
    }, 0);
  }

  async function send() {
    if (!val.trim() && attachments.length === 0) return;
    
    try {
      let content = val.trim();
      
      // Add attachment markdown if we have attachments but no text
      if (content === '' && attachments.length > 0) {
        content = attachments.map(a => `[${a.filename}](${a.url})`).join('\n');
      }
      
      if (mode === "private" && pmUserEmail) {
        // Send as JSON array string: '["email@example.com"]'
        await sendMessage({ 
          type: "private", 
          to: `["${pmUserEmail}"]`, 
          content 
        });
      } else if (streamName) {
        await sendMessage({ 
          type: "stream", 
          stream: streamName, 
          topic: topic || "(no topic)", 
          content 
        });
      } else {
        console.error("Cannot send message: missing stream name or PM email");
        return;
      }
      
      setVal("");
      setAttachments([]);
      onSent();
    } catch (error) {
      console.error("Failed to send message:", error);
      // Fix error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to send message: ${errorMessage}`);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = ta.current!;
      const [start, end] = [el.selectionStart, el.selectionEnd]; // Rename 'e' to 'end'
      const newVal = val.slice(0, start) + '    ' + val.slice(end);
      setVal(newVal);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      }, 0);
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Create a fake event for the file input
      const event = {
        target: { files }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event);
    }
  };

  // Add paste support for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            // Create a fake event for the file input
            const event = {
              target: { files: [file] }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileSelect(event);
          }
        }
      }
    };

    const textarea = ta.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
      return () => textarea.removeEventListener('paste', handlePaste);
    }
  }, []);

  return (
    <div className="glass p-4 flex flex-col gap-3">
      <div className="text-xs text-zinc-400">
        {mode === "private" ? <>DM → <span className="text-zinc-200">{pmUserEmail}</span></>
          : <>Stream <span className="text-zinc-200">#{streamName}</span>{topic && <> · Topic <span className="text-zinc-200">{topic}</span></>}</>}
      </div>
      
      <div className="flex gap-2 text-zinc-300">
        <button onClick={() => wrap("**")} title="Bold" className="p-1 rounded hover:bg-white/10">
          <Bold size={16}/>
        </button>
        <button onClick={() => wrap("*")} title="Italic" className="p-1 rounded hover:bg-white/10">
          <Italic size={16}/>
        </button>
        <button onClick={() => wrap("```","\n```")} title="Code block" className="p-1 rounded hover:bg-white/10">
          <Code size={16}/>
        </button>
        <button onClick={() => wrap("> ")} title="Quote" className="p-1 rounded hover:bg-white/10">
          <Quote size={16}/>
        </button>
        <button onClick={() => wrap("**Spoiler:** ||","||")} title="Spoiler" className="p-1 rounded hover:bg-white/10">
          <EyeOff size={16}/>
        </button>
        <button onClick={() => wrap("1. ")} title="Ordered list" className="p-1 rounded hover:bg-white/10">
          <ListOrdered size={16}/>
        </button>
        <button onClick={() => wrap("- ")} title="Unordered list" className="p-1 rounded hover:bg-white/10">
          <List size={16}/>
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()} 
          title="Attach file" 
          className="p-1 rounded hover:bg-white/10"
          disabled={uploading}
        >
          <Paperclip size={16}/>
        </button>
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="*/*"
          className="hidden"
        />
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="flex items-center gap-2 bg-white/5 rounded px-2 py-1 text-xs">
              <Paperclip size={12} />
              <span className="max-w-[120px] truncate" title={attachment.name}>
                {attachment.filename}
              </span>
              <button 
                onClick={() => removeAttachment(index)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative"
      >
        <textarea
          ref={ta}
          className="w-full h-28 bg-transparent outline-none resize-none p-3 rounded-md border border-white/10 focus:border-white/20 transition-colors"
          placeholder={quotedMessage ? "Reply to message..." : "Type a message… (or drag & drop files)"}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
            <div className="text-sm">Uploading files...</div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-zinc-500">
          {val.length} characters • {attachments.length} file{attachments.length !== 1 ? 's' : ''}
        </div>
        <button 
          onClick={send} 
          disabled={(!val.trim() && attachments.length === 0) || uploading}
          className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Send ⌘/Ctrl+Enter'}
        </button>
      </div>
    </div>
  );
}
