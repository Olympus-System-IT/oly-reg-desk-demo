import { useSyncExternalStore } from "react";
import { buildSeed, DB_VERSION } from "./seed";
import type { DB } from "./types";

const KEY = "hms-demo-db";
let state: DB | null = null;
let serverSnap: DB | null = null;
const listeners = new Set<() => void>();

function load(): DB {
  if (state) return state;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DB;
        if (parsed.version === DB_VERSION) {
          state = parsed;
          return state;
        }
      }
    } catch {
      /* ignore */
    }
  }
  state = buildSeed();
  return state;
}

export function getDB() {
  return load();
}

export function mutate(fn: (db: DB) => void) {
  const next = structuredClone(load());
  fn(next);
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function resetDemo() {
  state = buildSeed();
  const keepAuth = { userId: null, module: null };
  state.auth = keepAuth;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function nextId(db: DB, key: string) {
  db.counters[key] = (db.counters[key] ?? 0) + 1;
  return db.counters[key];
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, load, () => (serverSnap ??= buildSeed()));
}

export function useCurrentUser() {
  const db = useDB();
  return db.users.find((u) => u.id === db.auth.userId) ?? null;
}
