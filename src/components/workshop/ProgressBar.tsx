interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = [
  "Welcome",
  "Business Info",
  "LinkedIn Profile",
  "ICP Builder",
  "Value Props",
  "Website",
  "GTM Strategy",
  "Outreach",
];

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  if (currentStep === 0) return null;
  const pct = (currentStep / totalSteps) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-0.5 bg-border w-full">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="bg-background/90 backdrop-blur-md border-b border-border px-4 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Step <span className="text-primary font-semibold">{currentStep}</span> of {totalSteps}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {stepLabels[currentStep] || ""}
          </span>
        </div>
      </div>
    </div>
  );
}
