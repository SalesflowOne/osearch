/** OWeb constellation integration config for OSearch. */

export const OWEB_APP_URL =
  process.env.NEXT_PUBLIC_OWEB_APP_URL || 'https://oweb.one';

export const OWEB_BILLING_URL = `${OWEB_APP_URL}/billing`;

export const OWEB_APPS_URL = `${OWEB_APP_URL}/apps`;

export const SOURCE_APP = 'osearch' as const;

export const GUEST_MAX_SEARCHES = Number(
  process.env.OSEARCH_GUEST_MAX_SEARCHES || 5,
);

/** When true (or when Supabase URL is set), constellation auth/billing paths activate. */
export function isOwebModeEnabled(): boolean {
  if (process.env.OSEARCH_OWEB_MODE === 'false') return false;
  if (process.env.OSEARCH_OWEB_MODE === 'true') return true;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
}

export function getSupabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || null;
}

export function getSupabaseAnonKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    null
  );
}

export function getSupabaseServiceRoleKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    null
  );
}

/** Credit cost by optimization mode (× model multiplier later). */
export const SEARCH_CREDIT_COSTS = {
  speed: 1,
  balanced: 2,
  quality: 5,
} as const;

export type OptimizationMode = keyof typeof SEARCH_CREDIT_COSTS;

export const PACKAGE_LIMITS = {
  none: {
    searchesPerDay: 0,
    qualityMode: false,
    uploads: false,
    imageVideo: false,
  },
  lite: {
    searchesPerDay: 15,
    qualityMode: false,
    uploads: false,
    imageVideo: false,
  },
  standard: {
    searchesPerDay: 75,
    qualityMode: false,
    uploads: true,
    imageVideo: true,
  },
  pro: {
    searchesPerDay: 300,
    qualityMode: true,
    uploads: true,
    imageVideo: true,
  },
  enterprise: {
    searchesPerDay: 10_000,
    qualityMode: true,
    uploads: true,
    imageVideo: true,
  },
} as const;

export type OsearchPackage = keyof typeof PACKAGE_LIMITS;

export const PLAN_TO_PACKAGE: Record<string, OsearchPackage> = {
  free: 'lite',
  starter: 'standard',
  pro: 'pro',
  team: 'pro',
  scale: 'enterprise',
};

export function packageForPlan(planSlug: string | null | undefined): OsearchPackage {
  return PLAN_TO_PACKAGE[planSlug || 'free'] || 'lite';
}
