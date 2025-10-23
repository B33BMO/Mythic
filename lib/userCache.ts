"use client";

import { listUsers, getUserByEmail } from "./zulip";

class UserCache {
  private cache = new Map<string, any>();
  private loading = new Map<string, Promise<any>>();
  private allUsersLoaded = false;

  async getUserByEmail(email: string): Promise<any | null> {
    // Check cache first
    if (this.cache.has(email)) {
      return this.cache.get(email);
    }

    // Check if already loading
    if (this.loading.has(email)) {
      return this.loading.get(email);
    }

    // If we haven't loaded all users yet, try that first
    if (!this.allUsersLoaded) {
      const loadPromise = this.loadAllUsers();
      this.loading.set('__all__', loadPromise);
      
      try {
        await loadPromise;
        // Now check cache again after loading all users
        if (this.cache.has(email)) {
          return this.cache.get(email);
        }
      } catch (error) {
        console.error('Failed to load all users:', error);
      }
    }

    // Fallback to individual user load (with rate limiting)
    const loadPromise = this.loadIndividualUser(email);
    this.loading.set(email, loadPromise);
    
    try {
      const user = await loadPromise;
      this.cache.set(email, user);
      return user;
    } finally {
      this.loading.delete(email);
    }
  }

  private async loadAllUsers(): Promise<void> {
    try {
      const users = await listUsers();
      users.forEach(user => {
        this.cache.set(user.email, user);
      });
      this.allUsersLoaded = true;
    } catch (error) {
      console.error('Failed to load all users:', error);
      throw error;
    }
  }

  private async loadIndividualUser(email: string): Promise<any | null> {
    // Add a small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      return await getUserByEmail(email);
    } catch (error) {
      console.error(`Failed to load user ${email}:`, error);
      return null;
    }
  }

  // Preload all users (call this once when app starts)
  async preload(): Promise<void> {
    if (!this.allUsersLoaded) {
      await this.loadAllUsers();
    }
  }
}

export const userCache = new UserCache();
