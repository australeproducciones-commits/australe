"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PublicSessionUser } from "@/lib/auth/getPublicSessionUser";
import { normalizeRole } from "@/lib/auth/routeAccess";
import { createClient } from "@/lib/supabase/client";

const PROFILE_COLUMNS =
  "id, full_name, whatsapp, role, is_active, staff_all_events" as const;

type PublicAuthContextValue = {
  sessionUser: PublicSessionUser | null;
  sessionReady: boolean;
};

const PublicAuthContext = createContext<PublicAuthContextValue>({
  sessionUser: null,
  sessionReady: false,
});

async function resolveSessionUserFromClient(): Promise<PublicSessionUser | null> {
  const supabase = createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return null;
  }

  const user = session.user;
  const { data, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !data) {
    return null;
  }

  return {
    email: user.email ?? null,
    profile: {
      id: data.id,
      full_name: data.full_name,
      whatsapp: data.whatsapp,
      role: normalizeRole(data.role),
      is_active: data.is_active,
      staff_all_events: data.staff_all_events ?? false,
    },
  };
}

export function PublicAuthProvider({ children }: { children: ReactNode }) {
  const [sessionUser, setSessionUser] = useState<PublicSessionUser | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const syncInFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function syncSession() {
      if (syncInFlight.current) {
        return syncInFlight.current;
      }

      const task = (async () => {
        const resolved = await resolveSessionUserFromClient();
        if (!active) {
          return;
        }
        setSessionUser(resolved);
        setSessionReady(true);
      })();

      syncInFlight.current = task.finally(() => {
        syncInFlight.current = null;
      });

      return syncInFlight.current;
    }

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncSession();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ sessionUser, sessionReady }),
    [sessionUser, sessionReady],
  );

  return (
    <PublicAuthContext.Provider value={value}>{children}</PublicAuthContext.Provider>
  );
}

export function usePublicAuth() {
  return useContext(PublicAuthContext);
}
