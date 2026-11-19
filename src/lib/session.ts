// "Who is signed in?" for the browser. One shared answer, so the sidebar, the guard and the header
// all agree and the server is asked only once per page load.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getSessionApi, logoutApi } from "./auth-api";
import type { SessionUser } from "./auth-types";

export type SessionState =
  | { status: "loading" }
  | { status: "ready"; user: SessionUser | null }
  | { status: "error"; problem: string; hint: string };

const LOADING: SessionState = { status: "loading" };
let current: SessionState = LOADING;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: SessionState) {
  current = next;
  listeners.forEach((l) => l());
}

function refreshSession(): Promise<void> {
  inflight ??= (async () => {
    try {
      const r = await getSessionApi();
      publish(r.ok ? { status: "ready", user: r.user } : { status: "error", problem: r.problem, hint: r.hint });
    } catch {
      publish({
        status: "error",
        problem: "Could not reach the server.",
        hint: "Check your internet connection and try again.",
      });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useSession(): { state: SessionState; retry: () => void } {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => LOADING, // the server never knows; the browser asks after the page appears
  );
  useEffect(() => {
    if (current.status === "loading") void refreshSession();
  }, []);
  const retry = useCallback(() => {
    publish(LOADING);
    void refreshSession();
  }, []);
  return { state, retry };
}

// Ends the session on the server, then reloads the entry page so no data from this account stays in memory.
export async function signOut(): Promise<void> {
  try {
    await logoutApi();
  } catch {
    // Even if this fails the page still reloads; the cookie simply expires on its own.
  }
  window.location.assign("/");
}
