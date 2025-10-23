"use client";
import { useEffect, useState } from "react";
import { userCache } from "@/lib/userCache";

function initials(name: string) {
  return name.split(" ").map(p => p[0] || "").join("").slice(0,2).toUpperCase();
}

export default function EnhancedAvatar({ 
  email, 
  name, 
  size = 36 
}: { 
  email?: string;
  name: string; 
  size?: number 
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }

    const loadAvatar = async () => {
      setLoading(true);
      try {
        const user = await userCache.getUserByEmail(email);
        if (user?.avatar_url) {
          const url = user.avatar_url.startsWith('http') 
            ? user.avatar_url 
            : `https://zulip.cyburity.com${user.avatar_url}`;
          setAvatarUrl(url);
        }
      } catch (error) {
        console.error('Failed to load avatar for:', email, error);
      } finally {
        setLoading(false);
      }
    };

    loadAvatar();
  }, [email]);

  if (avatarUrl && !loading) {
    return (
      <img
        src={avatarUrl}
        style={{ width: size, height: size }}
        className="rounded-full border border-white/10 object-cover"
        alt={name}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    );
  }

  // Fallback to initials
  return (
    <div 
      style={{ width: size, height: size }}
      className="rounded-full bg-zinc-700/60 flex items-center justify-center text-xs border border-white/10"
    >
      {loading ? "..." : initials(name)}
    </div>
  );
}
