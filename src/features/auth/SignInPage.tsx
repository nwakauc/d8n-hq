import { useEffect, useId, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth.ts";
import { PasswordField } from "./PasswordField.tsx";
import { signInErrorMessage } from "./authErrors.ts";
import { HqLogo } from "../hq/HqLogo.tsx";

/** Sign in to one brand at a time — see HQ-EXTRACTION-PLAN.md for why this
 * app holds one Bearer token per brand instead of one shared session. An
 * operator with access to all three brands signs in here up to three times
 * (once per brand, the first time); the brand switcher then just swaps
 * between already-cached tokens with no further sign-in. */
export default function SignInPage() {
  const identifierId = useId();
  const brandId = useId();
  const errorId = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const { brands, activeBrand, signIn } = useAuth();
  const [brandSlug, setBrandSlug] = useState(activeBrand ?? brands[0]?.slug ?? "");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    document.title = "Sign in — D8N HQ";
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !brandSlug) {
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      await signIn(brandSlug, identifier.trim(), password);
      const from =
        typeof location.state === "object" &&
        location.state !== null &&
        "from" in location.state &&
        typeof location.state.from === "string"
          ? location.state.from
          : "/hq";
      navigate(from, { replace: true });
    } catch (caught) {
      setError(signInErrorMessage(caught));
      setPending(false);
    }
  }

  if (brands.length === 0) {
    return (
      <main className="hq-signin">
        <div className="hq-signin__panel hq-card">
          <h1>D8N HQ is not configured</h1>
          <p>Set VITE_HQ_BRANDS in .env before this app can reach any brand&apos;s API.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="hq-signin">
      <form className="hq-signin__panel hq-card" onSubmit={(event) => void onSubmit(event)}>
        <div className="hq-signin__brand">
          <HqLogo size={42} />
          <h1>D8N HQ</h1>
        </div>
        <p className="hq-signin__lead">
          Sign in with the operator account for the brand you want to work in. HQ requires an
          active admin assignment and a step-up authenticator code after this.
        </p>
        {error ? (
          <p className="hq-signin__error" id={errorId} role="alert">
            {error}
          </p>
        ) : null}
        <div className="auth-field">
          <label htmlFor={brandId}>Brand</label>
          <select
            id={brandId}
            value={brandSlug}
            disabled={pending}
            onChange={(event) => setBrandSlug(event.target.value)}
          >
            {brands.map((brand) => (
              <option key={brand.slug} value={brand.slug}>
                {brand.label}
              </option>
            ))}
          </select>
        </div>
        <div className="auth-field">
          <label htmlFor={identifierId}>Email or phone</label>
          <input
            id={identifierId}
            name="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            disabled={pending}
            required
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          disabled={pending}
          describedBy={error ? errorId : undefined}
        />
        <button className="hq-button hq-button--primary" type="submit" disabled={pending}>
          {pending ? "Signing in…" : `Sign in to ${brands.find((b) => b.slug === brandSlug)?.label ?? "brand"}`}
        </button>
      </form>
    </main>
  );
}
