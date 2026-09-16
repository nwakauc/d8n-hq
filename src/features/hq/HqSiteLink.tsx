import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth.ts";

type Props = {
  /** Sidebar footer, compact header chip, or standalone inline escape on gate screens. */
  variant: "sidebar" | "header" | "inline";
  onNavigate?: () => void;
};

/**
 * Sign out of the active brand and return to sign-in. There is no
 * "member-facing app" to escape back to in this standalone app (unlike
 * dateza's version of this component, which linked back to /discover) —
 * this app's only other screen is sign-in.
 */
export function HqSiteLink({ variant, onNavigate }: Props) {
  const navigate = useNavigate();
  const { activeBrand, signOut } = useAuth();

  async function handleSignOut() {
    if (activeBrand) {
      await signOut(activeBrand);
    }
    onNavigate?.();
    navigate("/sign-in", { replace: true });
  }

  const label = "Sign out";
  const className =
    variant === "sidebar"
      ? "hq-site-link hq-site-link--sidebar"
      : variant === "inline"
        ? "hq-site-link hq-site-link--inline"
        : "hq-control hq-control--button hq-site-link hq-site-link--header";

  return (
    <button type="button" className={className} onClick={() => void handleSignOut()} aria-label={label}>
      {label}
    </button>
  );
}
