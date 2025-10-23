"use client";

function initials(name: string) {
  return name.split(" ").map(p => p[0] || "").join("").slice(0,2).toUpperCase();
}

export default function Avatar({ 
  user, 
  name, 
  size = 28 
}: { 
  user?: { 
    avatar_url?: string | null;
    avatar_version?: number;
  }; 
  name: string; 
  size?: number 
}) {
  // If we have a valid avatar URL from Zulip, use it
  if (user?.avatar_url) {
    const avatarUrl = user.avatar_url.startsWith('http') 
      ? user.avatar_url 
      : `https://zulip.cyburity.com${user.avatar_url}`;
    
    return (
      <img 
        src={avatarUrl} 
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-white/10"
        alt={name}
        onError={(e) => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.nextElementSibling?.setAttribute('style', `display: flex; width: ${size}px; height: ${size}px`);
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
      {initials(name)}
    </div>
  );
}
