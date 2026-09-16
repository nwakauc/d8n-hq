import type { ReactNode } from "react";
import { HqSiteLink } from "./HqSiteLink.tsx";
import "./hq.css";

/** Wraps HQ loading, access-denied, and MFA screens with a consistent exit back to DateZA. */
export function HqStatusFrame({ children }: { children: ReactNode }) {
  return (
    <div className="hq-status-frame">
      <div className="hq-status-frame__exit">
        <HqSiteLink variant="inline" />
      </div>
      {children}
    </div>
  );
}
