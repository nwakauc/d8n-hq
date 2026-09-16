import { useHqMode } from "../useHqMode.ts";

export function FounderModeToggle({ compact }: { compact?: boolean }) {
  const { mode, setMode } = useHqMode();

  return (
    <div
      className={`founder-mode-toggle${compact ? " founder-mode-toggle--compact" : ""}`}
      role="group"
      aria-label="HQ experience mode"
    >
      <button
        type="button"
        className={mode === "founder" ? "is-active" : ""}
        aria-pressed={mode === "founder"}
        onClick={() => setMode("founder")}
      >
        Founder
      </button>
      <button
        type="button"
        className={mode === "ops" ? "is-active" : ""}
        aria-pressed={mode === "ops"}
        onClick={() => setMode("ops")}
      >
        Ops
      </button>
    </div>
  );
}
