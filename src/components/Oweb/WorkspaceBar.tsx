'use client';

import { useState } from 'react';
import { useOwebAuth } from '@/lib/oweb/AuthProvider';

const WorkspaceBar = () => {
  const {
    enabled,
    loading,
    user,
    workspaces,
    workspaceId,
    setWorkspaceId,
    signInWithPassword,
    signOut,
    billingUrl,
    owebUrl,
  } = useOwebAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="fixed top-3 right-3 z-50 text-xs text-white/50">
        Connecting…
      </div>
    );
  }

  if (!user) {
    return (
      <form
        className="fixed top-3 right-3 z-50 flex flex-col gap-2 rounded-xl border border-white/10 bg-[#070a10]/95 p-3 shadow-lg backdrop-blur"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const err = await signInWithPassword(email, password);
          if (err) setError(err);
          setBusy(false);
        }}
      >
        <div className="flex items-center gap-2">
          <img src="/osearch-mark.svg" alt="" className="h-5 w-5" />
          <span className="text-xs font-medium text-white/80">
            Sign in with OWeb
          </span>
        </div>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-[#22D3EE]/60"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-[#22D3EE]/60"
        />
        {error && <p className="text-[11px] text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[#22D3EE] px-2 py-1.5 text-xs font-semibold text-[#04121a] disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Continue'}
        </button>
        <a
          href={`${owebUrl}/signup`}
          className="text-center text-[11px] text-white/50 hover:text-[#22D3EE]"
        >
          Create free account
        </a>
      </form>
    );
  }

  const current = workspaces.find((w) => w.id === workspaceId);

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-xl border border-white/10 bg-[#070a10]/95 px-3 py-2 text-xs text-white/80 shadow-lg backdrop-blur">
      <img src="/osearch-mark.svg" alt="" className="h-4 w-4" />
      {workspaces.length > 0 ? (
        <select
          value={workspaceId || ''}
          onChange={(e) => setWorkspaceId(e.target.value)}
          className="max-w-[140px] truncate rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-xs outline-none"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-white/50">No workspace</span>
      )}
      {current && (
        <span className="hidden sm:inline text-white/45">
          {current.creditsBalance} cr · {current.plan}
        </span>
      )}
      <a
        href={billingUrl}
        target="_blank"
        rel="noreferrer"
        className="text-[#22D3EE] hover:underline"
      >
        Billing
      </a>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-white/45 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
};

export default WorkspaceBar;
