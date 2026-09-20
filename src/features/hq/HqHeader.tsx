import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HqSiteLink } from "./HqSiteLink.tsx";
import { FounderModeToggle } from "./founder/FounderModeToggle.tsx";
import { useHqBrand } from "./useHqBrand.ts";
import { useAuth } from "../auth/useAuth.ts";
import { formatOperatorRole } from "../../lib/hq/capabilities.ts";

/**
 * Real brand switcher: each brand this app is configured for (VITE_HQ_BRANDS)
 * gets its own Bearer token (tokenStore.ts), because D8N resolves brand from
 * the request's Host and pins a session to one brand at issuance — see
 * HQ-EXTRACTION-PLAN.md. Switching to a brand with a cached token is
 * instant; switching to one without sends the operator to sign in for it
 * (once per brand, the first time in a browser session).
 */
export function BrandSelector() {
  const { status } = useHqBrand();
  const { brands, activeBrand, signedInBrands, setActiveBrand } = useAuth();
  const navigate = useNavigate();

  if (status === "loading") {
    return (
      <div className="hq-control hq-control--muted" aria-busy="true">
        Loading brand…
      </div>
    );
  }

  function selectBrand(brandSlug: string) {
    if (brandSlug === activeBrand) {
      return;
    }
    if (signedInBrands.includes(brandSlug)) {
      setActiveBrand(brandSlug);
      return;
    }
    setActiveBrand(brandSlug);
    navigate("/sign-in", { state: { from: "/hq" } });
  }

  return (
    <div className="hq-brand-pills" role="tablist" aria-label="Brand context">
      {brands.map((brand) => {
        const isActive = brand.slug === activeBrand;
        const needsSignIn = !signedInBrands.includes(brand.slug);
        return (
          <button
            key={brand.slug}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`hq-brand-pill${isActive ? " is-active" : ""}`}
            onClick={() => selectBrand(brand.slug)}
            title={needsSignIn ? `${brand.label} — sign in required` : brand.label}
          >
            <span className="hq-brand-pill__label">{brand.label}</span>
            {needsSignIn ? <span className="hq-brand-pill__flag" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function GlobalSearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="hq-control hq-control--button" onClick={onOpen}>
      <span>Search D8N</span>
      <kbd>⌘K</kbd>
    </button>
  );
}

export function GlobalSearchPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }
  return <GlobalSearchPaletteOpen onClose={onClose} />;
}

function GlobalSearchPaletteOpen({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const inputId = useId();
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    const params = new URLSearchParams();
    params.set("q", trimmed);
    params.set("run", "1");
    onClose();
    void navigate(`/hq/members?${params.toString()}`);
  }

  return (
    <div className="hq-palette" role="dialog" aria-modal="true" aria-labelledby={inputId}>
      <div className="hq-palette__panel">
        <input
          id={inputId}
          className="hq-palette__input"
          autoFocus
          value={query}
          placeholder="Email, phone, or profile public id"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
        />
        <p className="hq-palette__hint">
          Exact identifier lookup on this brand only. Unknown and cross-brand identifiers both look
          like “not found” — that is intentional.
        </p>
      </div>
      <button type="button" className="visually-hidden" onClick={onClose}>
        Close search
      </button>
    </div>
  );
}

export function OperatorIdentity() {
  const { operatorLabel, operator } = useHqBrand();
  const initial = operatorLabel.trim().slice(0, 1).toUpperCase() || "O";
  const roleLabel = operator ? formatOperatorRole(operator.role) : "Operator";

  return (
    <div className="hq-operator" aria-label="Signed-in operator">
      <div className="hq-operator__avatar" aria-hidden="true">
        {initial}
      </div>
      <div className="hq-operator__meta">
        <span className="hq-operator__name">{operatorLabel}</span>
        <span className="hq-operator__role">{roleLabel}</span>
      </div>
    </div>
  );
}

export function HqHeader({
  title,
  subtitle,
  onOpenSearch,
  onToggleSidebar,
}: {
  title: string;
  subtitle?: string;
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="hq-header">
      <div className="hq-header__titles">
        <button
          type="button"
          className="hq-control hq-control--button hq-mobile-nav-toggle"
          onClick={onToggleSidebar}
          aria-label="Open navigation"
        >
          Menu
        </button>
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="hq-header__controls">
        <FounderModeToggle compact />
        <HqSiteLink variant="header" />
        <BrandSelector />
        <GlobalSearchTrigger onOpen={onOpenSearch} />
        <OperatorIdentity />
      </div>
    </header>
  );
}
