import type { CurrentSessionStore, GuestIdentityStore, IdGenerator } from "@/application/ports";

const SESSION_KEY = "scenario-shop.session-id";
const GUEST_KEY = "scenario-shop.guest-id";

export class BrowserCurrentSessionStore implements CurrentSessionStore {
  async getSessionId(): Promise<string | null> {
    return localStorage.getItem(SESSION_KEY);
  }

  async setSessionId(id: string): Promise<void> {
    localStorage.setItem(SESSION_KEY, id);
  }

  async clear(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
  }
}

export class BrowserGuestIdentityStore implements GuestIdentityStore {
  constructor(private readonly idGenerator: IdGenerator) {}

  async getOrCreateGuestId(): Promise<string> {
    const existing = localStorage.getItem(GUEST_KEY);
    if (existing !== null) {
      return existing;
    }
    const created = this.idGenerator.generate();
    localStorage.setItem(GUEST_KEY, created);
    return created;
  }

  async setGuestId(id: string): Promise<void> {
    localStorage.setItem(GUEST_KEY, id);
  }

  async clear(): Promise<void> {
    localStorage.removeItem(GUEST_KEY);
  }
}
