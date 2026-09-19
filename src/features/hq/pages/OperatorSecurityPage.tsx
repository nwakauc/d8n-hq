import { useEffect, useState } from "react";
import { fetchHqOperatorSessions, revokeHqOperatorSession } from "../../../lib/hq/api.ts";
import type { HqOperatorSession } from "../../../lib/hq/types.ts";

export default function OperatorSecurityPage() {
  const [sessions, setSessions] = useState<HqOperatorSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => { void fetchHqOperatorSessions().then(setSessions).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not load operator sessions.")); };
  useEffect(load, []);
  return <section className="hq-page">
    <header className="hq-page__header"><div><p className="hq-eyebrow">Administration</p><h1>Operator security</h1><p>Review and revoke active HQ operator sessions.</p></div><button type="button" className="hq-btn hq-btn--ghost" onClick={load}>Refresh</button></header>
    {error ? <p role="alert">{error}</p> : null}
    <div className="hq-card"><table className="hq-table"><thead><tr><th>Device</th><th>IP</th><th>Last used</th><th>Expires</th><th /></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td>{session.device_name ?? session.user_agent ?? "Unknown"}{session.current ? " · current" : ""}</td><td>{session.ip_address ?? "—"}</td><td>{session.last_used_at}</td><td>{session.expires_at}</td><td>{session.current ? null : <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => { void revokeHqOperatorSession(session.id).then(load); }}>Revoke</button>}</td></tr>)}</tbody></table></div>
  </section>;
}
