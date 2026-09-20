import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../../../lib/api/errors.ts";
import {
  correctProfileIdentity,
  fetchHqAuthAttempts,
  fetchHqDiscoveryDiagnostic,
  fetchHqEnforcements,
  fetchHqMember360,
  fetchHqMemberTimeline,
  fetchHqSecurityEvents,
  hqErrorMessage,
  publishHqMemberProfile,
  restrictProfileDiscovery,
  restoreProfileDiscovery,
  recordTrustAdjustment,
} from "../../../lib/hq/api.ts";
import { canManageIdentityCorrections } from "../../../lib/hq/enforcementAccess.ts";
import { operatorHasCapability } from "../../../lib/hq/capabilities.ts";
import { displayNameForMember } from "../../../lib/hq/parse.ts";
import type { HqDiscoveryDiagnostic, HqMember360, HqTimelineEvent } from "../../../lib/hq/types.ts";
import { useHqBrand } from "../useHqBrand.ts";
import { useHqOperator } from "../useHqOperator.ts";
import { HqHistoryPanel } from "../components/HqHistoryPanel.tsx";
import {
  CollapsibleSection,
  DataTable,
  DiagnosticBreakdown,
  StateBanner,
  StatGroup,
  StatusBadge,
  UnavailableState,
} from "../components/HqPrimitives.tsx";

const GENDER_OPTIONS = ["man", "woman", "nonbinary", "person"] as const;
const LOOKING_FOR_OPTIONS = GENDER_OPTIONS;

function GenderEditor({
  profileId,
  currentGender,
  onCorrected,
}: {
  profileId: string;
  currentGender: string | null;
  onCorrected: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentGender ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => setOpen(true)}>
        Correct gender
      </button>
    );
  }

  return (
    <div className="hq-card" style={{ display: "grid", gap: 8, marginTop: 8 }}>
      {error ? <StateBanner tone="error" title="Could not save" body={error} /> : null}
      <label className="hq-card__subtitle">
        New gender
        <select
          value={value}
          onChange={(event) => setValue(event.target.value)}
          style={{ display: "block", marginTop: 4, width: "100%" }}
        >
          <option value="" disabled>
            Choose…
          </option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="hq-card__subtitle">
        Reason (required, audited)
        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. photo doesn't match stated gender, member requested correction"
          style={{ display: "block", marginTop: 4, width: "100%" }}
        />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="hq-btn hq-btn--ghost hq-btn--sm"
          disabled={saving}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="hq-btn hq-btn--primary hq-btn--sm"
          disabled={saving || !value || !reason.trim()}
          onClick={() => {
            setSaving(true);
            setError(null);
            void correctProfileIdentity(profileId, "gender", value, reason.trim())
              .then(() => {
                setOpen(false);
                onCorrected();
              })
              .catch((caught: unknown) => setError(hqErrorMessage(caught)))
              .finally(() => setSaving(false));
          }}
        >
          {saving ? "Saving…" : "Save correction"}
        </button>
      </div>
    </div>
  );
}

function LookingForEditor({ profileId, currentValues, onCorrected }: { profileId: string; currentValues: string[]; onCorrected: () => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentValues[0] ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) return <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => setOpen(true)}>Correct who they&apos;re looking for</button>;
  return <div className="hq-card" style={{ display: "grid", gap: 8, marginTop: 8 }}>
    {error ? <StateBanner tone="error" title="Could not save" body={error} /> : null}
    <label className="hq-card__subtitle">Looking for<select value={value} onChange={(event) => setValue(event.target.value)} style={{ display: "block", marginTop: 4, width: "100%" }}><option value="" disabled>Choose…</option>{LOOKING_FOR_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
    <label className="hq-card__subtitle">Reason (required, audited)<input type="text" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. corrected after member request" style={{ display: "block", marginTop: 4, width: "100%" }} /></label>
    <div style={{ display: "flex", gap: 8 }}><button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => setOpen(false)}>Cancel</button><button type="button" className="hq-btn hq-btn--primary hq-btn--sm" disabled={saving || !value || !reason.trim()} onClick={() => { setSaving(true); setError(null); void correctProfileIdentity(profileId, "interested_in", [value], reason.trim()).then(() => { setOpen(false); onCorrected(); }).catch((caught: unknown) => setError(hqErrorMessage(caught))).finally(() => setSaving(false)); }}>{saving ? "Saving…" : "Save correction"}</button></div>
  </div>;
}

const SECTION_KEYS = [
  "overview",
  "identity",
  "profile",
  "product",
  "comms",
  "safety",
  "activity",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

/** One section open at a time (a tab, not a freely-stackable accordion) --
 * the old default opened three sections simultaneously, which is exactly
 * the "too much at once" clutter this page needs to stop doing. */
function parseOpenSections(raw: string | null): Set<SectionKey> {
  if (!raw) {
    return new Set(["overview"]);
  }
  const first = raw.split(",")[0];
  if ((SECTION_KEYS as readonly string[]).includes(first)) {
    return new Set([first as SectionKey]);
  }
  return new Set(["overview"]);
}

type LoadResult =
  | { status: "ready"; member: HqMember360 }
  | { status: "forbidden" | "not_found" | "error"; message: string };

async function loadMember(lookup: string): Promise<LoadResult> {
  try {
    const member = await fetchHqMember360(lookup);
    return { status: "ready", member };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 403) {
      return { status: "forbidden", message: hqErrorMessage(error) };
    }
    if (error instanceof ApiError && error.status === 404) {
      return { status: "not_found", message: hqErrorMessage(error) };
    }
    return { status: "error", message: hqErrorMessage(error) };
  }
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

export default function Member360Page() {
  const { lookup: lookupParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brandName } = useHqBrand();
  const { operator } = useHqOperator();
  const canCorrectIdentity = canManageIdentityCorrections(operator);
  const canManageDiscovery = operatorHasCapability(operator, "admin.discovery_restrictions.manage");
  const canManagePublication = operatorHasCapability(operator, "admin.profile_publication.manage");
  const canManageTrust = operatorHasCapability(operator, "admin.trust_adjustments.manage");
  const lookup = lookupParam ? decodeURIComponent(lookupParam) : "";
  const [load, setLoad] = useState<{ key: string; result: LoadResult | null }>({
    key: lookup,
    result: null,
  });
  const [diagNonce, setDiagNonce] = useState(0);
  const [publicationReason, setPublicationReason] = useState("");
  const [publicationOpen, setPublicationOpen] = useState(false);
  const [publicationPending, setPublicationPending] = useState(false);
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<{
    key: string;
    result:
      | { status: "ready"; data: HqDiscoveryDiagnostic }
      | { status: "forbidden" | "error" | "no_profile"; message: string }
      | null;
  }>({ key: "", result: null });

  const openSections = useMemo(
    () => parseOpenSections(searchParams.get("sections")),
    [searchParams],
  );
  const historyTab = searchParams.get("history"); // security | auth | enforcements

  function selectSection(key: SectionKey) {
    const params = new URLSearchParams(searchParams);
    params.set("sections", key);
    setSearchParams(params, { replace: true });
  }

  function setHistoryTab(tab: string | null) {
    const params = new URLSearchParams(searchParams);
    if (!tab) {
      params.delete("history");
    } else {
      params.set("history", tab);
      const sections = parseOpenSections(params.get("sections"));
      if (tab === "security" || tab === "auth") {
        sections.add("activity");
      }
      if (tab === "enforcements") {
        sections.add("safety");
      }
      params.set("sections", Array.from(sections).join(","));
    }
    setSearchParams(params, { replace: true });
  }

  useEffect(() => {
    if (!lookup) {
      return;
    }
    let cancelled = false;
    const key = lookup;
    void loadMember(lookup).then((result) => {
      if (!cancelled) {
        setLoad({ key, result });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lookup]);

  const status: "loading" | "missing" | LoadResult["status"] = !lookup
    ? "missing"
    : load.key !== lookup || load.result === null
      ? "loading"
      : load.result.status;
  const member = load.result?.status === "ready" && load.key === lookup ? load.result.member : null;
  const errorMessage =
    load.result && load.result.status !== "ready" && load.key === lookup
      ? load.result.message
      : null;

  const reloadMember = useCallback(() => {
    if (!lookup) return;
    void loadMember(lookup).then((result) => setLoad({ key: lookup, result }));
  }, [lookup]);

  async function publishMember() {
    if (!member?.sections.profile.exists || !publicationReason.trim() || publicationPending) return;
    setPublicationPending(true);
    setPublicationError(null);
    try {
      await publishHqMemberProfile(member.sections.profile.public_id, publicationReason);
      setPublicationReason("");
      setPublicationOpen(false);
      reloadMember();
    } catch (error: unknown) {
      setPublicationError(hqErrorMessage(error));
    } finally {
      setPublicationPending(false);
    }
  }

  const productOpen = Boolean(member && openSections.has("product"));
  const diagnosticStatus =
    !productOpen
      ? "idle"
      : diagnostic.key !== lookup || diagnostic.result === null
        ? "loading"
        : diagnostic.result.status;

  useEffect(() => {
    if (!productOpen || !lookup) {
      return;
    }
    let cancelled = false;
    void fetchHqDiscoveryDiagnostic(lookup)
      .then((data) => {
        if (!cancelled) {
          setDiagnostic({ key: lookup, result: { status: "ready", data } });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setDiagnostic({
            key: lookup,
            result: { status: "forbidden", message: hqErrorMessage(error) },
          });
          return;
        }
        if (error instanceof ApiError && error.code === "profile_unavailable") {
          setDiagnostic({
            key: lookup,
            result: { status: "no_profile", message: hqErrorMessage(error) },
          });
          return;
        }
        setDiagnostic({
          key: lookup,
          result: { status: "error", message: hqErrorMessage(error) },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [diagNonce, lookup, productOpen]);

  function refreshDiagnostic() {
    setDiagnostic({ key: "", result: null });
    setDiagNonce((value) => value + 1);
  }

  const activityOpen = Boolean(member && openSections.has("activity"));
  const [timeline, setTimeline] = useState<{
    key: string;
    result: { status: "ready"; events: HqTimelineEvent[] } | { status: "error"; message: string } | null;
  }>({ key: "", result: null });
  const timelineStatus =
    !activityOpen ? "idle" : timeline.key !== lookup || timeline.result === null ? "loading" : timeline.result.status;

  useEffect(() => {
    if (!activityOpen || !lookup) {
      return;
    }
    let cancelled = false;
    void fetchHqMemberTimeline(lookup)
      .then((events) => {
        if (!cancelled) setTimeline({ key: lookup, result: { status: "ready", events } });
      })
      .catch((error: unknown) => {
        if (!cancelled) setTimeline({ key: lookup, result: { status: "error", message: hqErrorMessage(error) } });
      });
    return () => {
      cancelled = true;
    };
  }, [activityOpen, lookup]);
  const loadSecurityPage = useCallback(
    async (cursor: string | null) => {
      const page = await fetchHqSecurityEvents(lookup, { cursor, limit: 25 });
      return { rows: page.security_events, next_cursor: page.next_cursor };
    },
    [lookup],
  );

  const loadAuthPage = useCallback(
    async (cursor: string | null) => {
      const page = await fetchHqAuthAttempts(lookup, { cursor, limit: 25 });
      return { rows: page.auth_attempts, next_cursor: page.next_cursor };
    },
    [lookup],
  );

  const loadEnforcementPage = useCallback(
    async (cursor: string | null) => {
      const page = await fetchHqEnforcements(lookup, { cursor, limit: 25 });
      return { rows: page.enforcements, next_cursor: page.next_cursor };
    },
    [lookup],
  );

  return (
    <div className="hq-content hq-page-member360">
      <nav className="hq-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/hq">Command Centre</Link>
        <span className="hq-breadcrumbs__sep">/</span>
        <Link to="/hq/members">Members</Link>
        <span className="hq-breadcrumbs__sep">/</span>
        <span>{member ? displayNameForMember(member) : lookup || "Unknown"}</span>
      </nav>

      {status === "loading" ? <p className="hq-loading">Loading member…</p> : null}

      {status === "missing" ? (
        <StateBanner tone="neutral" title="Member not found" body="Missing member lookup." />
      ) : null}

      {status === "forbidden" ? (
        <StateBanner tone="forbidden" title="Forbidden" body={errorMessage ?? "Not allowed."} />
      ) : null}

      {status === "not_found" ? (
        <StateBanner
          tone="neutral"
          title="Member not found"
          body={errorMessage ?? "No member matched this lookup for this brand."}
        />
      ) : null}

      {status === "error" ? (
        <StateBanner tone="error" title="Could not load Member 360" body={errorMessage ?? "Try again."} />
      ) : null}

      {status === "ready" && member ? (
        <>
          <div className="hq-member-hero hq-card">
            <div>
              <h2 className="hq-member-hero__name">{displayNameForMember(member)}</h2>
              <p className="hq-member-hero__meta">
                {brandName ?? member.member.brand}
                {member.member.profile_id ? ` · ${member.member.profile_id}` : " · no profile yet"}
                {` · user ${member.member.user_id}`}
                {` · membership ${member.member.membership_status}`}
              </p>
            </div>
            <Link className="hq-btn hq-btn--ghost" to="/hq/members">
              New search
            </Link>
          </div>

          <CollapsibleSection
            id="hq-overview"
            title="Overview"
            badge={<StatusBadge tone="success">Ready</StatusBadge>}
            open={openSections.has("overview")}
            onToggle={() => selectSection("overview")}
          >
            <StatGroup
              items={[
                { label: "Account type", value: member.sections.identity.account_type.label },
                { label: "Membership", value: member.sections.identity.membership_status },
                { label: "User status", value: member.sections.identity.user_status },
                {
                  label: "Profile",
                  value: member.sections.profile.exists
                    ? `${member.sections.profile.status} · ${member.sections.profile.visibility}`
                    : "No profile",
                },
                {
                  label: "Onboarding",
                  value: member.sections.profile.exists
                    ? `${member.sections.profile.onboarding_state} (${member.sections.profile.onboarding_completion_percent}%)`
                    : "—",
                },
                {
                  label: "Discovery",
                  value: member.sections.profile.exists ? member.sections.profile.discovery_state : "—",
                },
                { label: "Trust Score", value: member.sections.safety.trust_score ?? "—" },
                {
                  label: "RealMe",
                  value:
                    !member.sections.safety.realme || member.sections.safety.realme.length === 0
                      ? "Not started"
                      : `${member.sections.safety.realme.length} check${member.sections.safety.realme.length === 1 ? "" : "s"} · ${[...new Set(member.sections.safety.realme.map((entry) => entry.status))].join(", ")}`,
                },
                {
                  label: "Enforcement",
                  value: member.sections.safety.active_enforcement
                    ? `${member.sections.safety.active_enforcement.kind} · ${member.sections.safety.active_enforcement.state}`
                    : "None active",
                },
                { label: "Reports received", value: member.sections.safety.reports_received_count },
                { label: "Likes given / received", value: `${member.sections.product.likes_given} / ${member.sections.product.likes_received}` },
                { label: "Active matches", value: member.sections.product.matches_active },
                { label: "Conversations", value: member.sections.product.conversations_count },
              ]}
            />
            <div className="hq-directory__badges" style={{ marginTop: 12 }}>
              <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => selectSection("profile")}>
                Profile →
              </button>
              <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => selectSection("product")}>
                Marketplace →
              </button>
              <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => selectSection("safety")}>
                Safety →
              </button>
              <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => selectSection("activity")}>
                Activity →
              </button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="hq-identity"
            title="Identity"
            badge={<StatusBadge tone="success">Ready</StatusBadge>}
            open={openSections.has("identity")}
            onToggle={() => selectSection("identity")}
          >
            <StatGroup
              items={[
                { label: "User id", value: member.sections.identity.user_id },
                { label: "User status", value: member.sections.identity.user_status },
                { label: "First name", value: member.sections.identity.first_name },
                { label: "Last name", value: member.sections.identity.last_name },
                { label: "Membership", value: member.sections.identity.membership_status },
                { label: "Account type", value: member.sections.identity.account_type.label },
                { label: "Member since", value: formatWhen(member.sections.identity.member_since) },
                { label: "User created", value: formatWhen(member.sections.identity.user_created_at) },
              ]}
            />
            <DataTable
              columns={[
                { key: "kind", header: "Kind" },
                { key: "value", header: "Identifier" },
                { key: "verified_at", header: "Verified" },
                { key: "last_seen_at", header: "Last seen" },
              ]}
              rows={member.sections.identity.identifiers.map((item) => ({
                kind: item.kind,
                value: item.value,
                verified_at: formatWhen(item.verified_at),
                last_seen_at: formatWhen(item.last_seen_at),
              }))}
              empty="No identifiers."
            />
            <DataTable
              columns={[
                { key: "device", header: "Device" },
                { key: "ip", header: "IP" },
                { key: "last_used_at", header: "Last used" },
                { key: "expires_at", header: "Expires" },
                { key: "revoked_at", header: "Revoked" },
              ]}
              rows={member.sections.identity.recent_sessions.map((item) => ({
                device: item.device_name,
                ip: item.ip_address,
                last_used_at: formatWhen(item.last_used_at),
                expires_at: formatWhen(item.expires_at),
                revoked_at: formatWhen(item.revoked_at),
              }))}
              empty="No recent sessions."
            />
          </CollapsibleSection>

          <CollapsibleSection
            id="hq-profile"
            title="Profile"
            badge={
              member.sections.profile.exists ? (
                <StatusBadge tone="success">Ready</StatusBadge>
              ) : (
                <StatusBadge tone="warning">No profile</StatusBadge>
              )
            }
            open={openSections.has("profile")}
            onToggle={() => selectSection("profile")}
          >
            {!member.sections.profile.exists ? (
              <UnavailableState
                badge="NO PROFILE"
                title="This member has no profile yet"
                body="sections.profile.exists is false. Other profile fields are omitted by the API — not null placeholders."
              />
            ) : (
              <>
                <div className="hq-card" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                  <p className="hq-card__subtitle" style={{ margin: 0 }}>
                    Open profile — as it appears in the consumer app
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                    {member.sections.profile.photos.map((photo) =>
                      photo.image_url ? (
                        <img
                          key={photo.id}
                          src={photo.image_url}
                          alt=""
                          style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }}
                        />
                      ) : (
                        <div
                          key={photo.id}
                          style={{
                            aspectRatio: "1",
                            borderRadius: 8,
                            background: "rgba(0,0,0,0.06)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <span className="hq-card__subtitle">No derivative</span>
                        </div>
                      ),
                    )}
                  </div>
                  {member.sections.profile.video?.playback_url ? (
                    <video
                      src={member.sections.profile.video.playback_url}
                      poster={member.sections.profile.video.poster_url ?? undefined}
                      controls
                      playsInline
                      style={{ width: "100%", maxWidth: 320, borderRadius: 8 }}
                    />
                  ) : null}
                  {member.sections.profile.photos.length === 0 && !member.sections.profile.video ? (
                    <span className="hq-card__subtitle">No photos or video on record.</span>
                  ) : null}
                </div>
                <StatGroup
                  items={[
                    { label: "Public id", value: member.sections.profile.public_id },
                    { label: "Display name", value: member.sections.profile.display_name },
                    { label: "Status", value: member.sections.profile.status },
                    { label: "Visibility", value: member.sections.profile.visibility },
                    { label: "Gender", value: member.sections.profile.gender },
                    { label: "Birthdate", value: member.sections.profile.birthdate },
                    { label: "Country", value: member.sections.profile.country_code },
                    { label: "City", value: member.sections.profile.city },
                    { label: "Onboarding", value: member.sections.profile.onboarding_state },
                    { label: "Next step", value: member.sections.profile.onboarding_next_step },
                    {
                      label: "Completion",
                      value: `${member.sections.profile.onboarding_completion_percent}%`,
                    },
                    { label: "Photos", value: member.sections.profile.photo_count },
                  ]}
                />
                {canManageDiscovery ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <span className="hq-card__subtitle">Discovery: {member.sections.profile.discovery_state}</span>
                    {member.sections.profile.discovery_state === "moderator_hidden" ? (
                      <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => { void restoreProfileDiscovery(member.sections.profile.exists ? member.sections.profile.public_id : "").then(reloadMember).catch((error) => window.alert(hqErrorMessage(error))); }}>Restore to discovery</button>
                    ) : (
                      <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => { const reason = window.prompt("Restriction reason"); if (reason?.trim()) void restrictProfileDiscovery(member.sections.profile.exists ? member.sections.profile.public_id : "", reason.trim()).then(reloadMember).catch((error) => window.alert(hqErrorMessage(error))); }}>Hide from discovery</button>
                    )}
                  </div>
                ) : null}
                {canManagePublication && member.sections.profile.discovery_state !== "visible" && member.sections.profile.discovery_state !== "moderator_hidden" ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                    <span className="hq-card__subtitle">Publication: {member.sections.profile.discovery_state}</span>
                    <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => { setPublicationOpen((open) => !open); setPublicationError(null); }}>
                      {publicationOpen ? "Cancel publication" : "Make discoverable"}
                    </button>
                    {publicationOpen ? (
                      <div role="group" aria-label="Publish profile" style={{ display: "grid", gap: 8, flexBasis: "100%", maxWidth: 560 }}>
                        <label htmlFor="publication-reason">Audit reason</label>
                        <textarea
                          id="publication-reason"
                          value={publicationReason}
                          maxLength={500}
                          rows={3}
                          placeholder="Explain why this profile is ready to be discoverable."
                          onChange={(event) => setPublicationReason(event.target.value)}
                          disabled={publicationPending}
                        />
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button type="button" className="hq-btn hq-btn--primary hq-btn--sm" onClick={() => void publishMember()} disabled={publicationPending || !publicationReason.trim()}>
                            {publicationPending ? "Publishing…" : "Confirm publication"}
                          </button>
                          <span className="hq-card__subtitle">{publicationReason.length}/500</span>
                        </div>
                        {publicationError ? <p role="alert" className="hq-form-error">{publicationError}</p> : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {member.sections.profile.configured_fields ? (
                  <DataTable
                    columns={[{ key: "field", header: "Configured field" }, { key: "value", header: "Value" }]}
                    rows={Object.entries(member.sections.profile.configured_fields).filter(([key]) => !["id", "brand", "status", "visibility", "location", "options", "prompts", "counts", "verification", "publication", "completion", "publication_completion", "profile_completion"].includes(key)).map(([field, value]) => ({ field, value: typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value) }))}
                    empty="No additional configured fields."
                  />
                ) : null}
                {canCorrectIdentity ? (
                  <GenderEditor
                    profileId={member.sections.profile.public_id}
                    currentGender={member.sections.profile.gender}
                    onCorrected={reloadMember}
                  />
                ) : null}
                {member.sections.profile.preference ? (
                  <>
                  {canCorrectIdentity ? <LookingForEditor profileId={member.sections.profile.public_id} currentValues={member.sections.profile.preference.interested_in} onCorrected={reloadMember} /> : null}
                  <StatGroup
                    items={[
                      { label: "Min age", value: member.sections.profile.preference.min_age },
                      { label: "Max age", value: member.sections.profile.preference.max_age },
                      {
                        label: "Max distance km",
                        value: member.sections.profile.preference.max_distance_km,
                      },
                      {
                        label: "Intent",
                        value: member.sections.profile.preference.relationship_intent,
                      },
                      {
                        label: "Interested in",
                        value: member.sections.profile.preference.interested_in.join(", ") || "—",
                      },
                      { label: "Pref country", value: member.sections.profile.preference.country },
                    ]}
                  />
                  </>
                ) : null}
                <DataTable
                  columns={[
                    { key: "id", header: "Photo id" },
                    { key: "position", header: "Position" },
                    { key: "status", header: "Status" },
                    { key: "visibility", header: "Visibility" },
                    { key: "processing", header: "Processing" },
                  ]}
                  rows={member.sections.profile.photos.map((photo) => ({
                    id: photo.id,
                    position: photo.position,
                    status: photo.status,
                    visibility: photo.visibility,
                    processing: photo.processing_state,
                  }))}
                  empty="No photos on record."
                />
              </>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            id="hq-product"
            title="Marketplace"
            badge={<StatusBadge tone="success">Ready</StatusBadge>}
            open={openSections.has("product")}
            onToggle={() => selectSection("product")}
          >
            <StatGroup
              items={[
                { label: "Likes given", value: member.sections.product.likes_given },
                { label: "Likes received", value: member.sections.product.likes_received },
                { label: "Passes given", value: member.sections.product.passes_given ?? "—" },
                { label: "Passes received", value: member.sections.product.passes_received ?? "—" },
                { label: "Active matches", value: member.sections.product.matches_active },
                { label: "Hooks sent", value: member.sections.product.hooks_sent },
                { label: "Hooks received", value: member.sections.product.hooks_received },
                { label: "Live hooks sent", value: member.sections.product.hooks_live_sent },
                { label: "Live hooks received", value: member.sections.product.hooks_live_received },
                {
                  label: "Hook Tonight live",
                  value: member.sections.product.hook_tonight_live ? "Yes" : "No",
                },
                { label: "Conversations", value: member.sections.product.conversations_count },
                { label: "Blocks given", value: member.sections.product.blocks_given },
                { label: "Blocks received", value: member.sections.product.blocks_received },
              ]}
            />
            <DataTable
              columns={[
                { key: "id", header: "Conversation" },
                { key: "other", header: "Other member" },
                { key: "status", header: "Status" },
                { key: "messages", header: "Messages" },
                { key: "created_at", header: "Created" },
              ]}
              rows={member.sections.product.recent_conversations.map((row) => ({
                id: row.id,
                status: row.status,
                created_at: formatWhen(row.created_at),
                other: row.other_member?.display_name ?? "—",
                messages: row.messages?.length ?? 0,
              }))}
              empty="No recent conversations."
            />
            {member.sections.product.recent_conversations.some((row) => row.messages?.length) ? (
              <div className="hq-card__subsection">
                <h3 className="hq-card__title">Message chronology</h3>
                {member.sections.product.recent_conversations.flatMap((conversation) => (conversation.messages ?? []).map((message) => ({ conversation, message }))).slice(-50).map(({ conversation, message }) => (
                  <p key={message.id} className="hq-muted"><strong>{conversation.other_member?.display_name ?? message.sender_profile_id}</strong> · {formatWhen(message.created_at)} · {message.deleted ? "deleted" : message.body ?? `[${message.kind}]`}</p>
                ))}
              </div>
            ) : null}

            <div style={{ marginTop: 14 }}>
              <div className="hq-card__header">
                <h3 className="hq-card__title">Why is Discover empty?</h3>
                <button type="button" className="hq-btn hq-btn--ghost" onClick={refreshDiagnostic}>
                  Refresh diagnostic
                </button>
              </div>
              {diagnosticStatus === "loading" ? <p className="hq-loading">Running diagnostic…</p> : null}
              {diagnosticStatus === "forbidden" && diagnostic.result?.status === "forbidden" ? (
                <StateBanner tone="forbidden" title="Forbidden" body={diagnostic.result.message} />
              ) : null}
              {diagnosticStatus === "no_profile" && diagnostic.result?.status === "no_profile" ? (
                <UnavailableState
                  badge="NO PROFILE"
                  title="Discovery diagnostic needs a profile"
                  body={diagnostic.result.message}
                />
              ) : null}
              {diagnosticStatus === "error" && diagnostic.result?.status === "error" ? (
                <StateBanner tone="error" title="Diagnostic failed" body={diagnostic.result.message} />
              ) : null}
              {diagnosticStatus === "ready" && diagnostic.result?.status === "ready" ? (
                <DiagnosticBreakdown
                  title="Discovery funnel"
                  eligible={diagnostic.result.data.eligible}
                  ineligibilityReason={diagnostic.result.data.ineligibility_reason}
                  stages={diagnostic.result.data.stages}
                />
              ) : null}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="hq-comms"
            title="Support"
            badge={<StatusBadge tone="success">Ready</StatusBadge>}
            open={openSections.has("comms")}
            onToggle={() => selectSection("comms")}
          >
            <StatGroup
              items={Object.entries(member.sections.comms.delivery_counts_by_status).map(
                ([key, value]) => ({ label: `Status · ${key}`, value }),
              )}
            />
            <StatGroup
              items={Object.entries(member.sections.comms.delivery_counts_by_channel).map(
                ([key, value]) => ({ label: `Channel · ${key}`, value }),
              )}
            />
            <DataTable
              columns={[
                { key: "channel", header: "Channel" },
                { key: "status", header: "Status" },
                { key: "provider", header: "Provider" },
                { key: "error", header: "Error" },
                { key: "created_at", header: "Created" },
              ]}
              rows={member.sections.comms.recent_deliveries.map((row) => ({
                channel: row.channel,
                status: row.status,
                provider: row.provider,
                error: row.error_code,
                created_at: formatWhen(row.created_at),
              }))}
              empty="No recent deliveries."
            />
          </CollapsibleSection>

          <CollapsibleSection
            id="hq-safety"
            title="Safety"
            badge={<StatusBadge tone="success">Ready</StatusBadge>}
            open={openSections.has("safety")}
            onToggle={() => selectSection("safety")}
          >
            <StatGroup
              items={[
                { label: "Trust Score", value: member.sections.safety.trust_score ?? "—" },
                { label: "RealMe methods", value: member.sections.safety.realme?.length ?? 0 },
                { label: "Reports filed", value: member.sections.safety.reports_filed_count },
                { label: "Reports received", value: member.sections.safety.reports_received_count },
                { label: "Enforcement count", value: member.sections.safety.enforcement_count },
                {
                  label: "Active enforcement",
                  value: member.sections.safety.active_enforcement
                    ? `${member.sections.safety.active_enforcement.kind} · ${member.sections.safety.active_enforcement.state}`
                    : "None",
                },
                {
                  label: "Account closure",
                  value: member.sections.safety.account_closure?.media_purge_state ?? "—",
                },
              ]}
            />
            {member.sections.safety.realme?.length ? (
              <DataTable
                columns={[
                  { key: "check_type", header: "Method" },
                  { key: "status", header: "Status" },
                  { key: "submitted_at", header: "Submitted" },
                  { key: "reviewed_at", header: "Reviewed" },
                ]}
                rows={member.sections.safety.realme.map((entry) => ({
                  check_type: entry.check_type,
                  status: entry.status,
                  submitted_at: formatWhen(entry.submitted_at),
                  reviewed_at: formatWhen(entry.reviewed_at),
                }))}
                empty="No RealMe checks."
              />
            ) : null}
            {member.sections.safety.discovery_restriction ? (
              <div className="hq-card" style={{ marginTop: 12 }}>
                <p className="hq-card__title" style={{ margin: 0 }}>Moderator discovery restriction</p>
                <StatGroup
                  items={[
                    { label: "Restricted at", value: formatWhen(member.sections.safety.discovery_restriction.restricted_at) },
                    { label: "Reason", value: member.sections.safety.discovery_restriction.reason },
                    { label: "Note", value: member.sections.safety.discovery_restriction.note },
                    { label: "Restricted by admin", value: member.sections.safety.discovery_restriction.restricted_by_admin_user_id },
                  ]}
                />
              </div>
            ) : null}
            {member.sections.safety.account_closure ? (
              <div className="hq-card" style={{ marginTop: 12 }}>
                <p className="hq-card__title" style={{ margin: 0 }}>Deletion context</p>
                <StatGroup
                  items={[
                    { label: "Deleted at", value: formatWhen(member.sections.safety.account_closure.created_at) },
                    { label: "Media purge", value: member.sections.safety.account_closure.media_purge_state },
                    { label: "Likes given / received", value: `${member.sections.product.likes_given} / ${member.sections.product.likes_received}` },
                    { label: "Matches", value: member.sections.product.matches_active },
                    { label: "Conversations", value: member.sections.product.conversations_count },
                  ]}
                />
              </div>
            ) : null}
            {member.sections.safety.trust_breakdown?.length ? (
              <DataTable
                columns={[{ key: "label", header: "Trust signal" }, { key: "points", header: "Points" }, { key: "occurred_at", header: "When" }]}
                rows={member.sections.safety.trust_breakdown.slice(0, 10).map((entry, index) => ({ key: `${entry.type}-${index}`, label: entry.label, points: entry.applies ? entry.points : `${entry.points} (reversed)`, occurred_at: formatWhen(entry.occurred_at) }))}
                empty="No trust signals."
              />
            ) : null}
            {canManageTrust && member.sections.profile.exists ? (
              <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => { if (!member.sections.profile.exists) return; const points = Number(window.prompt("Trust points to deduct (negative number)", "-1")); const reason = window.prompt("Trust adjustment reason code", "manual_moderation"); if (Number.isFinite(points) && points < 0 && reason?.trim()) void recordTrustAdjustment(member.sections.profile.public_id, points, reason.trim()).then(reloadMember).catch((error) => window.alert(hqErrorMessage(error))); }}>Adjust Trust Score</button>
            ) : null}
            <DataTable
              columns={[
                { key: "id", header: "Report" },
                { key: "direction", header: "Direction" },
                { key: "status", header: "Status" },
                { key: "reason", header: "Reason" },
                { key: "target", header: "Target" },
                { key: "created_at", header: "Created" },
              ]}
              rows={member.sections.safety.recent_reports.map((row) => ({
                id: row.id,
                direction: row.direction,
                status: row.status,
                reason: row.reason,
                target: row.target_type,
                created_at: formatWhen(row.created_at),
              }))}
              empty="No recent reports."
            />

            <div style={{ marginTop: 12 }}>
              <div className="hq-card__header">
                <h3 className="hq-card__title">Enforcement history</h3>
                <button
                  type="button"
                  className="hq-btn hq-btn--ghost"
                  onClick={() => setHistoryTab(historyTab === "enforcements" ? null : "enforcements")}
                >
                  {historyTab === "enforcements" ? "Hide full history" : "Load full history"}
                </button>
              </div>
              {historyTab === "enforcements" ? (
                <HqHistoryPanel
                  key={`enforcements:${lookup}`}
                  loadPage={loadEnforcementPage}
                  emptyLabel="No enforcements."
                  columns={[
                    { key: "id", header: "Id" },
                    { key: "kind", header: "Kind" },
                    { key: "state", header: "State" },
                    { key: "reason", header: "Reason" },
                    { key: "admin", header: "Admin" },
                    { key: "created_at", header: "Created" },
                    { key: "reverted_at", header: "Reverted" },
                  ]}
                  mapRow={(row) => ({
                    id: row.id,
                    kind: row.kind,
                    state: row.state,
                    reason: row.reason,
                    admin: row.admin_user_id,
                    created_at: formatWhen(row.created_at),
                    reverted_at: formatWhen(row.reverted_at),
                  })}
                />
              ) : null}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="hq-activity"
            title="Activity"
            badge={<StatusBadge tone="success">Ready</StatusBadge>}
            open={openSections.has("activity")}
            onToggle={() => selectSection("activity")}
          >
            <StatGroup
              items={[{ label: "Last login", value: formatWhen(member.sections.activity.last_login_at) }]}
            />
            {/* Unified chronological timeline (security + auth + enforcement + trust,
                already merged server-side by Hq::Member360::Load#timeline) replaces the
                two separate auth/security summaries below, which just repeated a slice
                of the same events -- the full-history loaders further down still cover
                paginated per-kind detail this bounded timeline doesn't. */}
            {timelineStatus === "loading" ? <p className="hq-loading">Loading timeline…</p> : null}
            {timelineStatus === "error" && timeline.result?.status === "error" ? (
              <StateBanner tone="error" title="Could not load timeline" body={timeline.result.message} />
            ) : null}
            {timelineStatus === "ready" && timeline.result?.status === "ready" ? (
              <DataTable
                columns={[
                  { key: "type", header: "Type" },
                  { key: "name", header: "Event" },
                  { key: "created_at", header: "When" },
                ]}
                rows={timeline.result.events.map((event) => ({
                  type: event.type,
                  name: event.name,
                  created_at: formatWhen(event.created_at),
                }))}
                empty="No timeline events."
              />
            ) : null}

            <div className="hq-grid-2" style={{ marginTop: 12 }}>
              <div>
                <div className="hq-card__header">
                  <h3 className="hq-card__title">Security events</h3>
                  <button
                    type="button"
                    className="hq-btn hq-btn--ghost"
                    onClick={() => setHistoryTab(historyTab === "security" ? null : "security")}
                  >
                    {historyTab === "security" ? "Hide" : "Load security history"}
                  </button>
                </div>
                {historyTab === "security" ? (
                  <HqHistoryPanel
                    key={`security:${lookup}`}
                    loadPage={loadSecurityPage}
                    emptyLabel="No security events."
                    columns={[
                      { key: "event_type", header: "Event" },
                      { key: "severity", header: "Severity" },
                      { key: "ip", header: "IP" },
                      { key: "created_at", header: "When" },
                    ]}
                    mapRow={(row) => ({
                      event_type: row.event_type,
                      severity: row.severity,
                      ip: row.ip_address,
                      created_at: formatWhen(row.created_at),
                    })}
                  />
                ) : null}
              </div>
              <div>
                <div className="hq-card__header">
                  <h3 className="hq-card__title">Auth attempts</h3>
                  <button
                    type="button"
                    className="hq-btn hq-btn--ghost"
                    onClick={() => setHistoryTab(historyTab === "auth" ? null : "auth")}
                  >
                    {historyTab === "auth" ? "Hide" : "Load auth history"}
                  </button>
                </div>
                {historyTab === "auth" ? (
                  <HqHistoryPanel
                    key={`auth:${lookup}`}
                    loadPage={loadAuthPage}
                    emptyLabel="No auth attempts."
                    columns={[
                      { key: "kind", header: "Kind" },
                      { key: "result", header: "Result" },
                      { key: "identifier", header: "Identifier" },
                      { key: "ip", header: "IP" },
                      { key: "created_at", header: "When" },
                    ]}
                    mapRow={(row) => ({
                      kind: row.kind,
                      result: row.result,
                      identifier: row.identifier,
                      ip: row.ip_address,
                      created_at: formatWhen(row.created_at),
                    })}
                  />
                ) : null}
              </div>
            </div>
          </CollapsibleSection>
        </>
      ) : null}
    </div>
  );
}
