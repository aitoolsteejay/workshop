import { Save, RotateCcw } from "lucide-react";
import { RestartButton } from "./RestartButton";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onSave?: () => void;
  onRestart?: () => void;
}

const stepLabels = [
  "Welcome",
  "Onboarding",
  "Profile Optimiser",
  "ICP Builder",
  "Value Proposition",
  "Website Builder",
  "GTM Strategy",
  "Outreach Playbook",
];

export function ProgressBar({ currentStep, totalSteps, onSave, onRestart }: ProgressBarProps) {
  if (currentStep === 0) return null;
  const pct = (currentStep / totalSteps) * 100;
  const label = stepLabels[currentStep] || "";

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Progress line */}
      <div className="h-0.5 bg-border w-full">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Header bar */}
      <div className="bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* LEFT: Logo + Step */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/myntmore-logo.png"
              alt="Myntmore"
              className="h-8 sm:h-9 shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="h-5 w-px bg-border hidden sm:block shrink-0" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Step <span className="text-primary font-semibold">{currentStep}</span>
              <span className="text-muted-foreground"> / {totalSteps}</span>
            </span>
          </div>

          {/* CENTER: Section name */}
          <div className="flex-1 text-center min-w-0">
            <span className="text-sm sm:text-base font-semibold text-foreground tracking-tight truncate block">
              {label}
            </span>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onSave && (
              <button
                onClick={onSave}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-primary hover:bg-secondary border border-transparent hover:border-border transition-all"
                title="Save Progress"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save</span>
              </button>
            )}
            {onRestart && (
              <RestartButton onRestart={onRestart} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
