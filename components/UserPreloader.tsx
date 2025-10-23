"use client";
import { useEffect } from "react";
import { userCache } from "@/lib/userCache";

export default function UserPreloader() {
  useEffect(() => {
    userCache.preload().catch(console.error);
  }, []);
  
  return null; // This component doesn't render anything
}
