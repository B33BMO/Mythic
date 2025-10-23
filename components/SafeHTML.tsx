// components/SafeHTML.tsx - Fuck it, we ball edition
"use client";

interface SafeHTMLProps {
  html: string;
  className?: string;
}

export default function SafeHTML({ html, className = '' }: SafeHTMLProps) {
  if (!html.trim()) return null;

  // Add some basic safety but render mostly raw
  const cleanHTML = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');

  return (
    <div 
      className={`markdown ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHTML }} 
    />
  );
}
