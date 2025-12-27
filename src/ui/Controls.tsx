type Props = {
  canStep: boolean;
  isRunning: boolean;
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
};

export default function Controls({ canStep, isRunning, onRun, onStep, onReset }: Props) {
  return (
    <div className="controls">
      <button className="btn" onClick={onRun}>
        {isRunning ? "Re-run" : "Run"}
      </button>

      <button className={`btn ghost ${canStep ? "" : "disabled"}`} onClick={onStep} disabled={!canStep}>
        Step
      </button>

      <button className="btn ghost" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
