import {
  OWEB_BILLING_URL,
  PACKAGE_LIMITS,
  packageForPlan,
  type OsearchPackage,
  type OptimizationMode,
} from './config';
import type { OwebWorkspace } from './auth';

export type EntitlementDecision = {
  ok: boolean;
  packageSlug: OsearchPackage;
  reason?: string;
  upgradeUrl: string;
  limits: (typeof PACKAGE_LIMITS)[OsearchPackage];
};

export function resolveEntitlements(workspace: OwebWorkspace): EntitlementDecision {
  const packageSlug = packageForPlan(workspace.plan);
  const limits = PACKAGE_LIMITS[packageSlug];
  return {
    ok: packageSlug !== 'none',
    packageSlug,
    upgradeUrl: OWEB_BILLING_URL,
    limits,
    reason:
      packageSlug === 'none'
        ? 'OSearch is not included on your current plan.'
        : undefined,
  };
}

export function assertSearchAllowed(input: {
  workspace: OwebWorkspace;
  mode: OptimizationMode;
  hasFiles: boolean;
}): EntitlementDecision {
  const decision = resolveEntitlements(input.workspace);
  if (!decision.ok) return decision;

  if (input.mode === 'quality' && !decision.limits.qualityMode) {
    return {
      ...decision,
      ok: false,
      reason:
        'Quality / deep research requires Pro or higher. Upgrade in OWeb Billing.',
    };
  }

  if (input.hasFiles && !decision.limits.uploads) {
    return {
      ...decision,
      ok: false,
      reason: 'File uploads require Starter or higher. Upgrade in OWeb Billing.',
    };
  }

  return decision;
}
