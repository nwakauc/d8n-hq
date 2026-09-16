import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../../../lib/api/errors.ts";
import {
  fetchHqAuthAttempts,
  fetchHqDiscoveryDiagnostic,
  fetchHqEnforcements,
  fetchHqMember360,
  fetchHqSecurityEvents,
  hqErrorMessage,
} from "../../../lib/hq/api.ts";
import { displayNameForMember } from "../../../lib/hq/parse.ts";
import type { HqDiscoveryDiagnostic, HqMember360 } from "../../../lib/hq/types.ts";
import { useHqBrand } from "../useHqBrand.ts";
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

const SECTION_KEYS = [
  "identity",
  "profile",
  "product",
  "comms",
  "safety",
  "activity",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

function parseOpenSections(raw: string | null): Set<SectionKey> {
  if (!raw) {
    return new Set(["identity", "profile", "product"]);
  }
  const next = new Set<SectionKey>();
  for (const part of raw.split(",")) {
    if ((SECTION_KEYS as readonly string[]).includes(part)) {
      next.add(part as SectionKey);
    }
  }
  return next.size > 0 ? next : new Set(["identity"]);
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
  const lookup = lookupParam ? decodeURIComponent(lookupParam) : "";
  const [load, setLoad] = useState<{ key: string; result: LoadResult | null }>({
    key: lookup,
    result: null,
  });
  const [diagNonce, setDiagNonce] = useState(0);
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

  function toggleSection(key: SectionKey) {
    const next = new Set(openSections);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    const params = new URLSearchParams(searchParams);
    params.set("sections", Array.from(next).join(","));
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
            id="hq-identity"
            title="Identity"
            badge={<StatusBadge tone="success">Ready</StatusBadge>}
            open={openSections.has("identity")}
            onToggle={() => toggleSection("identity")}
          >
            <StatGroup
              items={[
                { label: "User id", value: member.sections.identity.user_id },
                { label: "User status", value: member.sections.identity.user_status },
                { label: "First name", value: member.sections.identity.first_name },
                { label: "Last name", value: member.sections.identity.last_name },
                { label: "Membership", value: member.sections.identity.membership_status },
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
            onToggle={() => toggleSection("profile")}
          >
            {!member.sections.profile.exists ? (
              <UnavailableState
                badge="NO PROFILE"
                title="This member has no profile yet"
                body="sections.profile.exists is false. Other profile fields are omitted by the API — not null placeholders."
              />
            ) : (
              <>
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
                {member.sections.profile.preference ? (
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
            title="Product"
            badge={<StatusBadge tone="success">Ready</StatusBadge>}
            open={openSections.has("product")}
            onToggle={() => toggleSection("product")}
          >
            <StatGroup
              items={[
                { label: "Likes given", value: member.sections.product.likes_given },
                { label: "Likes received", value: member.sections.product.likes_received },
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
                { key: "status", header: "Status" },
                { key: "created_at", header: "Created" },
              ]}
              rows={member.sections.product.recent_conversations.map((row) => ({
                id: row.id,
                status: row.status,
                created_at: formatWhen(row.created_at),
              }))}
              empty="No recent conversations."
            />

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
            title="Communications"
            badge={<StatusBadge tone="success">Ready</StatusBadge>}
            open={openSections.has("comms")}
            onToggle={() => toggleSection("comms")}
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
            onToggle={() => toggleSection("safety")}
          >
            <StatGroup
              items={[
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
            onToggle={() => toggleSection("activity")}
          >
            <StatGroup
              items={[{ label: "Last login", value: formatWhen(member.sections.activity.last_login_at) }]}
            />
            <DataTable
              columns={[
                { key: "kind", header: "Auth kind" },
                { key: "result", header: "Result" },
                { key: "ip", header: "IP" },
                { key: "created_at", header: "When" },
              ]}
              rows={member.sections.activity.recent_auth_attempts.map((row) => ({
                kind: row.kind,
                result: row.result,
                ip: row.ip_address,
                created_at: formatWhen(row.created_at),
              }))}
              empty="No recent auth attempts in the summary."
            />
            <DataTable
              columns={[
                { key: "event_type", header: "Event" },
                { key: "severity", header: "Severity" },
                { key: "created_at", header: "When" },
              ]}
              rows={member.sections.activity.recent_security_events.map((row) => ({
                event_type: row.event_type,
                severity: row.severity,
                created_at: formatWhen(row.created_at),
              }))}
              empty="No recent security events in the summary."
            />

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
