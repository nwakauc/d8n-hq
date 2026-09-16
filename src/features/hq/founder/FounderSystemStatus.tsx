import { useId, useState } from "react";
import type { HqVersionInfo } from "../../../lib/hq/types.ts";
import { formatWhenShort } from "../commandCentreMetric.ts";

function shortSha(sha: string | null | undefined): string | null {
  if (!sha) return null;
  return sha.slice(0, 7);
}

export function FounderSystemStatus({
  version,
  healthy = true,
}: {
  version: HqVersionInfo | null;
  healthy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const release = version?.release ?? version?.image_version ?? null;
  const sha = version?.git_sha ?? null;
  const deployedAt = version?.build_timestamp ?? version?.booted_at ?? null;

  return (
    <span className="founder-system-status">
      <button
        type="button"
        className={`founder-system-status__trigger${healthy ? " founder-system-status__trigger--healthy" : ""}`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((value) => !value)}
      >
        {healthy ? "System healthy" : "System status"}
      </button>
      {open ? (
        <span id={popoverId} role="dialog" className="founder-system-status__popover">
          <span className="founder-system-status__row">
            <span>Release</span>
            <strong>{release ?? shortSha(sha) ?? "—"}</strong>
          </span>
          {sha ? (
            <span className="founder-system-status__row">
              <span>Build</span>
              <code className="founder-system-status__sha" title={sha}>
                {shortSha(sha)}
              </code>
            </span>
          ) : null}
          {deployedAt ? (
            <span className="founder-system-status__row">
              <span>Deployed</span>
              <strong>{formatWhenShort(deployedAt)}</strong>
            </span>
          ) : null}
          {sha ? (
            <button
              type="button"
              className="founder-system-status__copy"
              onClick={() => void navigator.clipboard?.writeText(sha)}
            >
              Copy full SHA
            </button>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
