import { Navigate, useLocation } from "react-router-dom";
import { SessionStatusPage } from "../session/SessionStatusPage.tsx";
import { useAuth } from "../auth/useAuth.ts";
import type { ReactNode } from "react";
import { HqStatusFrame } from "./HqStatusFrame.tsx";
import { useBrandAdminAccess } from "./useBrandAdminAccess.ts";

type Props = {
  children: ReactNode;
};

/** Sign-in + brand-admin gate for /hq. Non-admins cannot enter by typing the URL. */
export function HqProtectedRoute({ children }: Props) {
  const { activeBrand, signedInBrands, brands } = useAuth();
  const location = useLocation();
  const adminAccess = useBrandAdminAccess();

  if (brands.length === 0) {
    return (
      <HqStatusFrame>
        <SessionStatusPage
          title="D8N HQ is not configured"
          body="No brands are configured for this app (VITE_HQ_BRANDS). Nothing to sign in to yet."
        />
      </HqStatusFrame>
    );
  }

  const hasToken = activeBrand !== undefined && signedInBrands.includes(activeBrand);
  if (!hasToken) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  }

  if (adminAccess === "unknown") {
    return (
      <HqStatusFrame>
        <SessionStatusPage
          title="Checking HQ access…"
          body="Confirming whether this account is an authorized operator for this brand."
          busy
        />
      </HqStatusFrame>
    );
  }

  if (adminAccess === "forbidden") {
    return (
      <HqStatusFrame>
        <SessionStatusPage
          title="HQ is for authorized operators"
          body="This account is signed in, but it does not have an active operator assignment for this brand."
        />
      </HqStatusFrame>
    );
  }

  if (adminAccess === "unavailable") {
    return (
      <HqStatusFrame>
        <SessionStatusPage
          title="Could not verify HQ access"
          body="Try again in a moment. If this keeps happening, refresh the page."
        />
      </HqStatusFrame>
    );
  }

  return children;
}
