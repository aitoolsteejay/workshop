import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Menu, X, Lock } from "lucide-react";

const STEP_NAMES = [
  "Basics",
  "Profile Optimiser",
  "Target Customers",
  "Value Proposition",
  "Website Builder",
  "Growth Strategy",
  "Outreach Playbook",
  "Final Summary",
];

interface ProgressSidebarProps {
  currentStep: number;
  onNavigate: (step: number) => void;
}

export function ProgressSidebar({ currentStep, onNavigate }: ProgressSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (currentStep < 1 || currentStep > 8) return null;

  const stepIcons = ["1", "2", "3", "4", "5", "6", "7"];

  const content = (
    <nav className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-4 border-b border-sidebar-border">
        {!collapsed && (
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Progress
          </h3>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 space-y-0.5 p-2 overflow-y-auto">
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
              className={`group w-full flex items-center gap-2.5 rounded-md text-sm transition-all text-left relative ${
                collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5"
              } ${
                isCurrent
                  ? "bg-sidebar-accent text-primary font-semibold border-l-2 border-primary"
                  : isCompleted
                  ? "text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
                  : "text-muted-foreground/40 cursor-not-allowed"
              }`}
              title={collapsed ? name : undefined}
            >
              <span
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-secondary text-muted-foreground/40"
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : isFuture ? <Lock className="w-2.5 h-2.5" /> : stepNum}
              </span>
              {!collapsed && <span className="truncate">{name}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden lg:block shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-sidebar-border bg-sidebar overflow-hidden transition-all duration-200 ${
          collapsed ? "w-14" : "w-52"
        }`}
      >
        {content}
      </div>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-56 bg-sidebar border-r border-sidebar-border">
            <div className="flex justify-end p-2">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
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
