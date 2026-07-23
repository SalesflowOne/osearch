import {
  SEARCH_CREDIT_COSTS,
  SOURCE_APP,
  type OptimizationMode,
} from './config';
import { createServiceSupabase } from './supabase';

export class InsufficientCreditsError extends Error {
  constructor(message = 'insufficient_credits') {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

export function creditCostForMode(
  mode: OptimizationMode,
  opts?: { hasFiles?: boolean },
): number {
  let cost = SEARCH_CREDIT_COSTS[mode] ?? SEARCH_CREDIT_COSTS.balanced;
  if (opts?.hasFiles) cost += 2;
  return cost;
}

export async function getOrgCreditBalance(orgId: string): Promise<number | null> {
  const admin = createServiceSupabase();
  if (!admin) return null;

  try {
    await admin.rpc('ao_grant_daily_credits_for_org', { _org: orgId });
  } catch {
    // best-effort daily grant
  }

  const { data, error } = await admin
    .from('ao_orgs')
    .select('credits_balance')
    .eq('id', orgId)
    .maybeSingle();

  if (error || !data) return null;
  return Number(data.credits_balance ?? 0);
}

export async function assertHasCredits(
  orgId: string,
  amount: number,
): Promise<void> {
  const balance = await getOrgCreditBalance(orgId);
  if (balance === null) {
    // Service role missing — skip hard gate in local/dev, log loudly.
    console.warn(
      '[oweb.credits] Skipping credit preflight — no service role client',
    );
    return;
  }
  if (balance < amount) throw new InsufficientCreditsError();
}

export type DebitSearchInput = {
  orgId: string;
  amount: number;
  messageId: string;
  mode: OptimizationMode;
  actorUserId?: string | null;
  model?: string | null;
  note?: string;
};

export async function debitSearchCredits(
  input: DebitSearchInput,
): Promise<number | null> {
  const admin = createServiceSupabase();
  if (!admin) {
    console.warn('[oweb.credits] Skipping debit — no service role client');
    return null;
  }

  const { data, error } = await admin.rpc('ao_debit_credits_v2', {
    _org: input.orgId,
    _amount: input.amount,
    _reason: 'chat',
    _note: input.note ?? `OSearch ${input.mode} search`,
    _source_app: SOURCE_APP,
    _resource_type: 'search',
    _idempotency_key: `osearch:${input.messageId}`,
    _metadata: {
      mode: input.mode,
      actor_user_id: input.actorUserId ?? null,
      model: input.model ?? null,
    },
  });

  if (error) {
    if (error.message?.includes('insufficient_credits')) {
      throw new InsufficientCreditsError();
    }
    throw new Error(error.message);
  }

  return typeof data === 'number' ? data : null;
}
