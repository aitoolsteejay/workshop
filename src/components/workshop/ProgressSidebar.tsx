import { useState } from "react";
import { Check, Menu, X } from "lucide-react";

const STEP_NAMES = [
  "Onboarding",
  "Profile Optimiser",
  "ICP Builder",
  "Value Propositions",
  "Website Builder",
  "GTM Strategy",
  "Outreach Playbook",
];

interface ProgressSidebarProps {
  currentStep: number;
  onNavigate: (step: number) => void;
}

export function ProgressSidebar({ currentStep, onNavigate }: ProgressSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (currentStep < 1 || currentStep > 7) return null;

  const content = (
    <nav className="space-y-1 p-3">
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Progress</h3>
      {STEP_NAMES.map((name, idx) => {
        const stepNum = idx + 1;
        const isCurrent = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        const isFuture = stepNum > currentStep;

        return (
          <button
            key={stepNum}
            type="button"
            disabled={isFuture}
            onClick={() => {
              if (!isFuture) {
                onNavigate(stepNum);
                setMobileOpen(false);
              }
            }}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors text-left ${
              isCurrent
                ? "bg-primary/15 text-primary font-semibold border border-primary/30"
                : isCompleted
                ? "text-foreground hover:bg-secondary cursor-pointer"
                : "text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
              isCurrent ? "accent-bg" : isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground/40"
            }`}>
              {isCompleted ? <Check className="w-3 h-3" /> : stepNum}
            </span>
            <span className="truncate">{name}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-52 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-border bg-background overflow-y-auto">
        {content}
      </div>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full accent-bg flex items-center justify-center shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-56 bg-background border-r border-border">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
