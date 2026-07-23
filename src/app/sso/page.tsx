'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/oweb/supabase';
import { isOwebModeEnabled } from '@/lib/oweb/config';

function SsoExchange() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState('Connecting to OWeb…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwebModeEnabled()) {
      setError('OWeb mode is not enabled on this deployment.');
      return;
    }

    const launchToken = params.get('launch_token');
    const accessToken = params.get('access_token');
    const workspaceId = params.get('workspace_id');
    const refreshToken = params.get('refresh_token');

    void (async () => {
      try {
        let payload: Record<string, string> = {};
        if (launchToken) {
          payload = { launch_token: launchToken };
        } else if (accessToken && workspaceId) {
          payload = {
            access_token: accessToken,
            workspace_id: workspaceId,
            ...(refreshToken ? { refresh_token: refreshToken } : {}),
          };
        } else {
          setError('Missing launch_token (or access_token + workspace_id).');
          return;
        }

        setStatus('Exchanging launch token…');
        const res = await fetch('/api/oweb/sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.message || 'SSO exchange failed');
          return;
        }

        const supabase = createBrowserSupabase();
        if (!supabase) {
          setError('Supabase is not configured');
          return;
        }

        if (json.access_token) {
          setStatus('Starting session…');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: json.access_token,
            refresh_token: json.refresh_token || json.access_token,
          });
          if (sessionError) {
            setError(sessionError.message);
            return;
          }
        }

        if (json.workspace_id) {
          try {
            localStorage.setItem('osearch.workspaceId', json.workspace_id);
          } catch {
            /* ignore */
          }
        }

        setStatus('Opening OSearch…');
        router.replace(json.next || '/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'SSO failed');
      }
    })();
  }, [params, router]);

  return (
    <>
      {error ? (
        <p className="max-w-sm text-sm text-red-300">{error}</p>
      ) : (
        <p className="text-sm text-white/55">{status}</p>
      )}
      {error && (
        <a href="/" className="text-sm text-[#22D3EE] hover:underline mt-2">
          Back to OSearch
        </a>
      )}
    </>
  );
}

export default function SsoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#070a10] px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/osearch-mark.svg" alt="OSearch" className="h-12 w-12" />
        <h1 className="font-display text-xl font-bold text-white tracking-tight">
          OSearch
        </h1>
        <Suspense fallback={<p className="text-sm text-white/55">Connecting…</p>}>
          <SsoExchange />
        </Suspense>
      </div>
    </main>
  );
}
