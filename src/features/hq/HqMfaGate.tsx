import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  challengeHqMfa,
  confirmHqMfaEnrollment,
  hqErrorMessage,
  startHqMfaEnrollment,
} from "../../lib/hq/api.ts";
import { ApiError } from "../../lib/api/errors.ts";
import type { HqCurrentOperator, HqMfaEnrollment } from "../../lib/hq/types.ts";
import { SessionStatusPage } from "../session/SessionStatusPage.tsx";
import { useHqOperator } from "./useHqOperator.ts";
import { HqSiteLink } from "./HqSiteLink.tsx";
import { HqStatusFrame } from "./HqStatusFrame.tsx";

type Props = {
  children: ReactNode;
};

export function HqMfaGate({ children }: Props) {
  const { status, operator, refresh } = useHqOperator();

  if (status === "loading") {
    return (
      <HqStatusFrame>
        <SessionStatusPage
          title="Loading HQ session…"
          body="Confirming your operator role, capabilities, and security state."
          busy
        />
      </HqStatusFrame>
    );
  }

  if (status === "unavailable" || !operator) {
    return (
      <HqStatusFrame>
        <SessionStatusPage
          title="Could not open HQ"
          body="Your operator session could not be loaded for this brand."
        />
      </HqStatusFrame>
    );
  }

  if (operator.mfa.state === "active" && operator.mfa.verified) {
    return children;
  }

  return <HqMfaFlow operator={operator} onComplete={() => refresh()} />;
}

function HqMfaFlow({
  operator,
  onComplete,
}: {
  operator: HqCurrentOperator;
  onComplete: () => Promise<void>;
}) {
  const [enrollment, setEnrollment] = useState<HqMfaEnrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const needsEnrollment = operator.mfa.state === "not_enrolled" || operator.mfa.state === "pending";

  if (recoveryCodes) {
    return (
      <RecoveryCodesPanel
        codes={recoveryCodes}
        onContinue={async () => {
          setRecoveryCodes(null);
          setEnrollment(null);
          await onComplete();
        }}
      />
    );
  }

  if (needsEnrollment) {
    return (
      <EnrollmentPanel
        operator={operator}
        enrollment={enrollment}
        onEnrollmentStarted={setEnrollment}
        onEnrolled={setRecoveryCodes}
      />
    );
  }

  return <ChallengePanel onComplete={onComplete} />;
}

function EnrollmentPanel({
  operator,
  enrollment,
  onEnrollmentStarted,
  onEnrolled,
}: {
  operator: HqCurrentOperator;
  enrollment: HqMfaEnrollment | null;
  onEnrollmentStarted: (value: HqMfaEnrollment) => void;
  onEnrolled: (codes: string[]) => void;
}) {
  const inputId = useId();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function beginEnrollment() {
    setPending(true);
    setError(null);
    try {
      const response = await startHqMfaEnrollment();
      onEnrollmentStarted(response.mfa);
    } catch (caught) {
      setError(hqErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function confirmEnrollment(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await confirmHqMfaEnrollment(code);
      onEnrolled(response.recovery_codes);
    } catch (caught) {
      setError(hqErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="hq-mfa">
      <HqSiteLink variant="inline" />
      <div className="hq-mfa__panel hq-card">
        <h1>Set up HQ multi-factor authentication</h1>
        <p className="hq-mfa__lead">
          HQ requires a one-time authenticator setup for{" "}
          <strong>{operator.current_brand}</strong>. Enrollment secrets and codes are never stored
          in the browser.
        </p>

        {!enrollment ? (
          <>
            <p>
              {operator.mfa.state === "pending"
                ? "Your enrollment is incomplete. Start again to get a fresh secret."
                : "Use an authenticator app such as 1Password, Authy, or Google Authenticator."}
            </p>
            {error ? <p className="hq-mfa__error">{error}</p> : null}
            <button
              type="button"
              className="hq-button hq-button--primary"
              disabled={pending}
              onClick={() => void beginEnrollment()}
            >
              {pending ? "Starting…" : "Start authenticator setup"}
            </button>
          </>
        ) : (
          <form onSubmit={(event) => void confirmEnrollment(event)}>
            <p>Add this account to your authenticator app, then enter the six-digit code.</p>
            <div className="hq-mfa__secret" aria-label="Authenticator secret">
              <code>{enrollment.secret}</code>
            </div>
            <p>
              <a href={enrollment.provisioning_uri} className="hq-inline-link">
                Open provisioning link
              </a>
            </p>
            <label className="hq-mfa__field" htmlFor={inputId}>
              Verification code
              <input
                id={inputId}
                className="hq-mfa__input"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={pending}
              />
            </label>
            {error ? <p className="hq-mfa__error">{error}</p> : null}
            <button type="submit" className="hq-button hq-button--primary" disabled={pending}>
              {pending ? "Confirming…" : "Confirm authenticator"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChallengePanel({ onComplete }: { onComplete: () => Promise<void> }) {
  const inputId = useId();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await challengeHqMfa(code);
      await onComplete();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "admin_mfa_required") {
        setError("Complete MFA before continuing.");
      } else {
        setError(hqErrorMessage(caught));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="hq-mfa">
      <HqSiteLink variant="inline" />
      <form className="hq-mfa__panel hq-card" onSubmit={(event) => void submit(event)}>
        <h1>Confirm it is you</h1>
        <p className="hq-mfa__lead">
          Enter a code from your authenticator app{useRecovery ? " or a one-time recovery code" : ""}{" "}
          to unlock HQ for this session.
        </p>
        <label className="hq-mfa__field" htmlFor={inputId}>
          {useRecovery ? "Recovery code" : "Authenticator code"}
          <input
            id={inputId}
            className="hq-mfa__input"
            inputMode={useRecovery ? "text" : "numeric"}
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={pending}
          />
        </label>
        {error ? <p className="hq-mfa__error">{error}</p> : null}
        <div className="hq-mfa__actions">
          <button type="submit" className="hq-button hq-button--primary" disabled={pending}>
            {pending ? "Verifying…" : "Unlock HQ"}
          </button>
          <button
            type="button"
            className="hq-button hq-button--ghost"
            disabled={pending}
            onClick={() => {
              setUseRecovery((current) => !current);
              setCode("");
              setError(null);
            }}
          >
            {useRecovery ? "Use authenticator code" : "Use recovery code"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RecoveryCodesPanel({
  codes,
  onContinue,
}: {
  codes: string[];
  onContinue: () => void | Promise<void>;
}) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="hq-mfa">
      <HqSiteLink variant="inline" />
      <div className="hq-mfa__panel hq-card">
        <h1>Save your recovery codes</h1>
        <p className="hq-mfa__lead">
          These eight codes are shown once. Store them offline. They can unlock HQ if you lose your
          authenticator.
        </p>
        <ul className="hq-mfa__codes">
          {codes.map((code) => (
            <li key={code}>
              <code>{code}</code>
            </li>
          ))}
        </ul>
        <label className="hq-mfa__checkbox">
          <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />
          I have stored these recovery codes offline
        </label>
        <button
          type="button"
          className="hq-button hq-button--primary"
          disabled={!saved}
          onClick={() => void onContinue()}
        >
          Continue to HQ
        </button>
      </div>
    </div>
  );
}
