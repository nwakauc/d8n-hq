import { useState } from "react";
import { accessPrivateAlbumItem, hqErrorMessage } from "../../../lib/hq/api.ts";
import type { HqCurrentOperator, HqPrivateMediaAccess } from "../../../lib/hq/types.ts";
import { operatorHasCapability } from "../../../lib/hq/capabilities.ts";

type ActionState = { status: "idle" } | { status: "pending" } | { status: "error"; message: string };

type PrivateMediaReviewProps = {
  itemId: string;
  reportId?: number;
  operator: HqCurrentOperator | null;
  description?: string;
};

const DEFAULT_DESCRIPTION =
  "Opening evidence is exceptional, requires an investigation reason, and creates an immutable sensitive-access audit event.";

export function PrivateMediaReview({ itemId, reportId, operator, description }: PrivateMediaReviewProps) {
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<ActionState>({ status: "idle" });
  const [media, setMedia] = useState<HqPrivateMediaAccess["item"] | null>(null);

  if (!operatorHasCapability(operator, "hq.private_media.sensitive_read")) {
    return <p className="hq-card__subtitle">Your operator access does not permit sensitive private-media review.</p>;
  }

  async function review() {
    if (!reason.trim() || action.status === "pending") return;
    setAction({ status: "pending" });
    try {
      const response = await accessPrivateAlbumItem(itemId, { report_id: reportId, reason: reason.trim() });
      setMedia(response.item);
      setAction({ status: "idle" });
    } catch (caught) {
      setAction({ status: "error", message: hqErrorMessage(caught) });
    }
  }

  return (
    <div>
      <p className="hq-card__subtitle">{description ?? DEFAULT_DESCRIPTION}</p>
      <label className="hq-field">
        <span>Review reason (required)</span>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} />
      </label>
      <button
        type="button"
        className="hq-btn hq-btn--primary"
        disabled={!reason.trim() || action.status === "pending"}
        onClick={() => void review()}
      >
        {action.status === "pending" ? "Authorizing…" : "Review sensitive evidence"}
      </button>
      {action.status === "error" ? <p className="hq-card__subtitle">{action.message}</p> : null}
      {media ? (
        <div style={{ marginTop: 16 }}>
          {media.media_kind === "video" ? (
            <video controls preload="metadata" src={media.view_url} poster={media.poster_url ?? undefined} style={{ maxWidth: "100%", maxHeight: 520 }} />
          ) : (
            <img src={media.view_url} alt="Private-media evidence" style={{ maxWidth: "100%", maxHeight: 520, objectFit: "contain" }} />
          )}
          <p className="hq-card__subtitle">Authorized URL expires in 60 seconds. Reloading requires a new audited access.</p>
        </div>
      ) : null}
    </div>
  );
}
