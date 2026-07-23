'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createBrowserSupabase } from './supabase';
import { isOwebModeEnabled, OWEB_APP_URL, OWEB_BILLING_URL } from './config';
import type { OwebWorkspace } from './auth';

type AuthState = {
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  isAnonymous: boolean;
  workspaces: OwebWorkspace[];
  workspaceId: string | null;
  setWorkspaceId: (id: string) => void;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signInAnonymously: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  accessToken: string | null;
  billingUrl: string;
  owebUrl: string;
};

const AuthContext = createContext<AuthState | null>(null);

const WORKSPACE_KEY = 'osearch.workspaceId';

export function OwebAuthProvider({ children }: { children: ReactNode }) {
  const enabled = isOwebModeEnabled();
  const [loading, setLoading] = useState(enabled);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<OwebWorkspace[]>([]);
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(null);

  const setWorkspaceId = useCallback((id: string) => {
    setWorkspaceIdState(id);
    try {
      localStorage.setItem(WORKSPACE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setWorkspaces([]);
      return;
    }
    const res = await fetch('/api/oweb/workspaces', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const list = (json.workspaces || []) as OwebWorkspace[];
    setWorkspaces(list);

    const stored =
      typeof window !== 'undefined'
        ? localStorage.getItem(WORKSPACE_KEY)
        : null;
    if (stored && list.some((w) => w.id === stored)) {
      setWorkspaceIdState(stored);
    } else if (list[0]) {
      setWorkspaceId(list[0].id);
    }
  }, [session?.access_token, setWorkspaceId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [enabled]);

  useEffect(() => {
    if (session?.access_token) {
      void refreshWorkspaces();
    } else {
      setWorkspaces([]);
    }
  }, [session?.access_token, refreshWorkspaces]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const supabase = createBrowserSupabase();
      if (!supabase) return 'Supabase is not configured';
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error?.message ?? null;
    },
    [],
  );

  const signInAnonymously = useCallback(async () => {
    const supabase = createBrowserSupabase();
    if (!supabase) return 'Supabase is not configured';
    const { error } = await supabase.auth.signInAnonymously();
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createBrowserSupabase();
    await supabase?.auth.signOut();
    setWorkspaces([]);
    setWorkspaceIdState(null);
  }, []);

  const isAnonymous =
    Boolean((user as { is_anonymous?: boolean } | null)?.is_anonymous) ||
    user?.app_metadata?.provider === 'anonymous';

  const value = useMemo<AuthState>(
    () => ({
      enabled,
      loading,
      session,
      user,
      isAnonymous,
      workspaces,
      workspaceId,
      setWorkspaceId,
      signInWithPassword,
      signInAnonymously,
      signOut,
      refreshWorkspaces,
      accessToken: session?.access_token ?? null,
      billingUrl: OWEB_BILLING_URL,
      owebUrl: OWEB_APP_URL,
    }),
    [
      enabled,
      loading,
      session,
      user,
      isAnonymous,
      workspaces,
      workspaceId,
      setWorkspaceId,
      signInWithPassword,
      signInAnonymously,
      signOut,
      refreshWorkspaces,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useOwebAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useOwebAuth must be used within OwebAuthProvider');
  }
  return ctx;
}
