import { useState } from "react";
import { hqErrorMessage, moderateCommunitySubmission, removeCommunityContent } from "../../../lib/hq/api.ts";
import { canModerateCommunity } from "../../../lib/hq/enforcementAccess.ts";
import type { HqCurrentOperator } from "../../../lib/hq/types.ts";

const QUEUE_TYPE: Record<string, "questions" | "answers" | "events" | "stories" | "circles"> = {
  community_question: "questions",
  community_answer: "answers",
  community_event: "events",
  community_story: "stories",
  community_circle: "circles",
};

const REMOVABLE_TYPE: Record<string, "posts" | "comments"> = {
  community_post: "posts",
  community_comment: "comments",
};

type ActionState = { status: "idle" } | { status: "pending" } | { status: "done" } | { status: "error"; message: string };

export function communityRemovalTargetType(reportTargetType: string): "queue" | "removable" | null {
  if (QUEUE_TYPE[reportTargetType]) return "queue";
  if (REMOVABLE_TYPE[reportTargetType]) return "removable";
  return null;
}

export function CommunityContentRemoval({
  reportTargetType,
  contentPublicId,
  operator,
}: {
  reportTargetType: string;
  contentPublicId: string;
  operator: HqCurrentOperator | null;
}) {
  const [action, setAction] = useState<ActionState>({ status: "idle" });

  if (!canModerateCommunity(operator)) {
    return <p className="hq-card__subtitle">Your operator access does not permit community content removal.</p>;
  }

  async function remove() {
    if (action.status === "pending") return;
    setAction({ status: "pending" });
    try {
      const queueType = QUEUE_TYPE[reportTargetType];
      const removableType = REMOVABLE_TYPE[reportTargetType];
      if (queueType) {
        await moderateCommunitySubmission(queueType, contentPublicId, "hidden");
      } else if (removableType) {
        await removeCommunityContent(removableType, contentPublicId);
      }
      setAction({ status: "done" });
    } catch (caught) {
      setAction({ status: "error", message: hqErrorMessage(caught) });
    }
  }

  return (
    <div>
      <p className="hq-card__subtitle">
        Hides this content from members immediately and records an audited moderation decision.
      </p>
      {action.status === "done" ? (
        <p className="hq-card__subtitle">Removed.</p>
      ) : (
        <button
          type="button"
          className="hq-btn hq-btn--danger"
          disabled={action.status === "pending"}
          onClick={() => void remove()}
        >
          {action.status === "pending" ? "Removing…" : "Remove this content"}
        </button>
      )}
      {action.status === "error" ? <p className="hq-card__subtitle">{action.message}</p> : null}
    </div>
  );
}
