import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { MultiSelect } from "./MultiSelect";
import { ArrowLeft } from "lucide-react";
import { INDUSTRIES } from "@/lib/constants";
import { useAutosave } from "@/hooks/use-autosave";

const SELLING_TO_OPTIONS = ["D2C", "B2B", "Both"];
const BUSINESS_TYPES = ["Product-based", "Service-based", "Hybrid"];

const REVENUE_OPTIONS = [
  "₹0–5 Lakhs", "₹5–10 Lakhs", "₹10–25 Lakhs", "₹25–50 Lakhs",
  "₹50 Lakhs–1 Cr", "₹1–2 Cr", "₹2–5 Cr", "₹5–10 Cr", "₹10 Cr+",
];

const EMPLOYEE_OPTIONS = ["1–10", "11–50", "51–200", "201–500", "500+"];

const GOAL_OPTIONS = [
  { label: "More leads", desc: "Generate more qualified prospects" },
  { label: "Better conversion", desc: "Turn prospects into customers" },
  { label: "Brand authority", desc: "Become the go-to in your space" },
  { label: "All of the above", desc: "Full-stack growth" },
];

interface Step1Props {
  data: any;
  onSave: (data: any, opts?: { silent?: boolean }) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step1Onboarding({ data, onSave, onNext, onBack }: Step1Props) {
  const [form, setForm] = useState({
    industry: data?.industry || [] as string[],
    industryOther: data?.industryOther || "",
    sellingTo: data?.sellingTo || [] as string[],
    businessType: data?.businessType || [] as string[],
    revenue: data?.revenue || [] as string[],
    revenueOther: data?.revenueOther || "",
    employees: data?.employees || [] as string[],
    goals: data?.goals || [] as string[],
    goalOther: data?.goalOther || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const goalOtherRef = useRef<HTMLInputElement>(null);
  const wasGoalOtherSelected = useRef(false);

  useAutosave(form, onSave);

  useEffect(() => {
    const isSelected = form.goals.includes("Other");
    if (isSelected && !wasGoalOtherSelected.current) {
      goalOtherRef.current?.focus();
    }
    wasGoalOtherSelected.current = isSelected;
  }, [form.goals]);

  const update = (key: string, value: any) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => ({ ...p, [key]: "" }));
  };

  const toggleGoal = (g: string) => {
    setForm(p => ({
      ...p,
      goals: p.goals.includes(g) ? p.goals.filter((x: string) => x !== g) : [...p.goals, g],
    }));
    setErrors(p => ({ ...p, goals: "" }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.industry.length === 0) errs.industry = "Select at least one industry";
    if (form.industry.includes("Other") && !form.industryOther.trim()) errs.industryOther = "Please specify your industry";
    if (form.sellingTo.length === 0) errs.sellingTo = "Select who you sell to";
    if (form.businessType.length === 0) errs.businessType = "Select your business type";
    if (form.revenue.length === 0) errs.revenue = "Select at least one revenue range";
    if (form.revenue.includes("Other") && !form.revenueOther.trim()) errs.revenueOther = "Please specify";
    if (form.employees.length === 0) errs.employees = "Select your team size";
    if (form.goals.length === 0) errs.goals = "Select at least one goal";
    if (form.goals.includes("Other") && !form.goalOther.trim()) errs.goalOther = "Please specify your goal";
    return errs;
  };

  const handleNext = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
    onNext();
  };

  const summaryItems = [
    { label: "Industry", value: form.industry.filter((x: string) => x !== "Other").concat(form.industryOther ? form.industryOther.split(",").map((s: string) => s.trim()) : []).join(", ") },
    { label: "Selling To", value: form.sellingTo.join(", ") },
    { label: "Business", value: form.businessType.join(", ") },
    { label: "Revenue", value: form.revenue.filter((x: string) => x !== "Other").join(", ") },
    { label: "Team Size", value: form.employees.join(", ") },
    { label: "Goals", value: form.goals.filter((x: string) => x !== "Other").join(", ") },
  ].filter(s => s.value);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Tell us about your <span className="accent-text">business</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">This helps us personalise your strategy</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-primary mb-4 uppercase tracking-wider">Business Basics</h3>
            <div className="space-y-4">
              <MultiSelect label="Industry" options={INDUSTRIES} selected={form.industry} onChange={v => update("industry", v)}
                hasOther otherValue={form.industryOther} onOtherChange={v => update("industryOther", v)} />
              {errors.industry && <p className="text-destructive text-xs mt-1">{errors.industry}</p>}
              {errors.industryOther && <p className="text-destructive text-xs mt-1">{errors.industryOther}</p>}

              <MultiSelect label="Who Do You Sell To" options={SELLING_TO_OPTIONS} selected={form.sellingTo} onChange={v => update("sellingTo", v)}
                hasOther={false} searchable={false} maxItems={1} />
              {errors.sellingTo && <p className="text-destructive text-xs mt-1">{errors.sellingTo}</p>}

              <MultiSelect label="Business Type" options={BUSINESS_TYPES} selected={form.businessType} onChange={v => update("businessType", v)}
                hasOther={false} searchable={false} maxItems={1} />
              {errors.businessType && <p className="text-destructive text-xs mt-1">{errors.businessType}</p>}

              <MultiSelect label="Monthly Revenue" options={REVENUE_OPTIONS} selected={form.revenue} onChange={v => update("revenue", v)}
                hasOther otherValue={form.revenueOther} onOtherChange={v => update("revenueOther", v)} />
              {errors.revenue && <p className="text-destructive text-xs mt-1">{errors.revenue}</p>}

              <MultiSelect label="Number of Employees" options={EMPLOYEE_OPTIONS} selected={form.employees} onChange={v => update("employees", v)}
                hasOther={false} searchable={false} maxItems={1} />
              {errors.employees && <p className="text-destructive text-xs mt-1">{errors.employees}</p>}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-primary mb-4 uppercase tracking-wider">Growth Objective</h3>
            <Label className="text-xs text-muted-foreground">Primary Goals</Label>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GOAL_OPTIONS.map(g => (
                <button key={g.label} type="button" onClick={() => toggleGoal(g.label)}
                  className={`text-left p-4 rounded-lg border transition-all ${form.goals.includes(g.label) ? "tag-selected border-primary" : "bg-secondary border-border hover:border-muted-foreground"}`}>
                  <div className={`text-sm font-medium ${form.goals.includes(g.label) ? "text-primary" : "text-foreground"}`}>{g.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
                </button>
              ))}
              <button type="button" onClick={() => toggleGoal("Other")}
                className={`text-left p-4 rounded-lg border transition-all ${form.goals.includes("Other") ? "tag-selected border-primary" : "bg-secondary border-border hover:border-muted-foreground"}`}>
                <div className={`text-sm font-medium ${form.goals.includes("Other") ? "text-primary" : "text-foreground"}`}>Other</div>
                <div className="text-xs text-muted-foreground mt-0.5">Custom goal</div>
              </button>
            </div>
            {errors.goals && <p className="text-destructive text-xs mt-2">{errors.goals}</p>}
            {form.goals.includes("Other") && (
              <div className="mt-3">
                <Input ref={goalOtherRef} placeholder="Enter custom goals (comma separated)" value={form.goalOther} onChange={(e) => update("goalOther", e.target.value)} className="bg-secondary border-border focus:border-primary" />
                {errors.goalOther && <p className="text-destructive text-xs mt-1">{errors.goalOther}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-primary mb-4 uppercase tracking-wider">Your Profile</h3>
              {summaryItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Start filling in your details...</p>
              ) : (
                <div className="space-y-3">
                  {summaryItems.map(s => (
                    <div key={s.label}>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="text-sm text-foreground font-medium">{s.value}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground italic">We're tailoring your strategy based on these inputs...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        ) : <div />}
        <Button onClick={handleNext} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
          Next Step →
        </Button>
      </div>
    </motion.div>
  );
}
