import { GUEST_MAX_SEARCHES, OWEB_APP_URL } from './config';
import { createServiceSupabase } from './supabase';

export class GuestLimitError extends Error {
  constructor(message = 'guest_limit') {
    super(message);
    this.name = 'GuestLimitError';
  }
}

export type GuestUsage = {
  userId: string;
  searchesUsed: number;
  remaining: number;
  max: number;
};

export async function getGuestUsage(userId: string): Promise<GuestUsage> {
  const admin = createServiceSupabase();
  const max = GUEST_MAX_SEARCHES;
  if (!admin) {
    return { userId, searchesUsed: 0, remaining: max, max };
  }

  const { data, error } = await admin
    .from('os_guest_search_usage')
    .select('searches_used, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[oweb.guest] getGuestUsage', error.message);
    return { userId, searchesUsed: 0, remaining: max, max };
  }

  if (data?.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    await admin.from('os_guest_search_usage').delete().eq('user_id', userId);
    return { userId, searchesUsed: 0, remaining: max, max };
  }

  const used = Number(data?.searches_used ?? 0);
  return {
    userId,
    searchesUsed: used,
    remaining: Math.max(0, max - used),
    max,
  };
}

/** Atomically claim one guest search. Throws GuestLimitError when exhausted. */
export async function claimGuestSearch(userId: string): Promise<GuestUsage> {
  const admin = createServiceSupabase();
  const max = GUEST_MAX_SEARCHES;
  if (!admin) {
    console.warn('[oweb.guest] No service role — allowing guest search without ledger');
    return { userId, searchesUsed: 0, remaining: max, max };
  }

  const current = await getGuestUsage(userId);
  if (current.searchesUsed >= max) {
    throw new GuestLimitError();
  }

  const next = current.searchesUsed + 1;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from('os_guest_search_usage').upsert(
    {
      user_id: userId,
      searches_used: next,
      claimed_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('[oweb.guest] claimGuestSearch', error.message);
    throw new Error(error.message);
  }

  return {
    userId,
    searchesUsed: next,
    remaining: Math.max(0, max - next),
    max,
  };
}

export function guestUpgradeUrl(): string {
  return `${OWEB_APP_URL}/signup?from=osearch`;
}
