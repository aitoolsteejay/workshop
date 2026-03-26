import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

const INDUSTRIES = [
  "SaaS", "Fintech", "Healthtech", "Edtech", "E-commerce", "D2C", "Agencies",
  "Consulting", "Coaching", "Real Estate", "Manufacturing", "Logistics", "HR Tech",
  "Martech", "Legal", "Finance", "Healthcare", "Recruitment", "IT Services",
  "AI / ML Startups", "B2B Services", "B2B SaaS", "Other"
];

const BUSINESS_TYPES = ["Service-based", "Product-based", "Hybrid", "Other"];
const REVENUE_OPTIONS = ["Pre-revenue", "Less than $5K", "$5K to $20K", "$20K to $50K", "$50K+", "Other"];
const GOAL_OPTIONS = ["More leads", "Better conversion", "Brand authority", "All of the above", "Other"];
const GEO_OPTIONS = ["India", "US", "UK", "Europe", "Southeast Asia", "Global", "Other"];

interface Step1Props {
  data: any;
  onSave: (data: any) => void;
  onNext: () => void;
}

export function Step1Onboarding({ data, onSave, onNext }: Step1Props) {
  const [form, setForm] = useState({
    linkedinUrl: data?.linkedinUrl || "",
    industry: data?.industry || "",
    industryOther: data?.industryOther || "",
    businessType: data?.businessType || "",
    businessTypeOther: data?.businessTypeOther || "",
    revenue: data?.revenue || "",
    revenueOther: data?.revenueOther || "",
    goal: data?.goal || "",
    goalOther: data?.goalOther || "",
    geography: data?.geography || [] as string[],
    geographyOther: data?.geographyOther || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: string, value: any) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => ({ ...p, [key]: "" }));
  };

  const toggleGeo = (g: string) => {
    setForm(p => ({
      ...p,
      geography: p.geography.includes(g) ? p.geography.filter((x: string) => x !== g) : [...p.geography, g]
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.linkedinUrl.trim()) errs.linkedinUrl = "LinkedIn URL is required";
    if (!form.industry) errs.industry = "Industry is required";
    if (form.industry === "Other" && !form.industryOther.trim()) errs.industryOther = "Please specify your industry";
    if (!form.businessType) errs.businessType = "Business type is required";
    if (form.businessType === "Other" && !form.businessTypeOther.trim()) errs.businessTypeOther = "Please specify your business type";
    if (!form.revenue) errs.revenue = "Revenue is required";
    if (form.revenue === "Other" && !form.revenueOther.trim()) errs.revenueOther = "Please specify your revenue";
    if (!form.goal) errs.goal = "Primary goal is required";
    if (form.goal === "Other" && !form.goalOther.trim()) errs.goalOther = "Please specify your goal";
    if (form.geography.length === 0) errs.geography = "Select at least one region";
    if (form.geography.includes("Other") && !form.geographyOther.trim()) errs.geographyOther = "Please specify your region";
    return errs;
  };

  const handleNext = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
    onNext();
  };

  const SelectField = ({ label, field, options, otherField }: { label: string; field: string; options: string[]; otherField?: string }) => (
    <div>
      <Label>{label}</Label>
      <select
        value={(form as any)[field]}
        onChange={(e) => update(field, e.target.value)}
        className="w-full mt-1.5 h-10 px-3 rounded-md bg-muted/50 border border-border/50 text-foreground text-sm"
      >
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {errors[field] && <p className="text-destructive text-xs mt-1">{errors[field]}</p>}
      {(form as any)[field] === "Other" && otherField && (
        <div className="mt-2">
          <Input
            placeholder="Please specify"
            value={(form as any)[otherField]}
            onChange={(e) => update(otherField, e.target.value)}
            className="bg-muted/50 border-border/50"
          />
          {errors[otherField] && <p className="text-destructive text-xs mt-1">{errors[otherField]}</p>}
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Tell us about your business</h2>
      <p className="text-muted-foreground mb-6">This helps us personalise your strategy</p>

      <div className="glass-card p-6 space-y-5">
        <div>
          <Label>LinkedIn Profile URL</Label>
          <Input
            value={form.linkedinUrl}
            onChange={(e) => update("linkedinUrl", e.target.value)}
            placeholder="https://linkedin.com/in/yourprofile"
            className="mt-1.5 bg-muted/50 border-border/50"
          />
          {errors.linkedinUrl && <p className="text-destructive text-xs mt-1">{errors.linkedinUrl}</p>}
        </div>

        <SelectField label="Industry" field="industry" options={INDUSTRIES} otherField="industryOther" />
        <SelectField label="Business Type" field="businessType" options={BUSINESS_TYPES} otherField="businessTypeOther" />
        <SelectField label="Current Monthly Revenue" field="revenue" options={REVENUE_OPTIONS} otherField="revenueOther" />

        <div>
          <Label>Primary Goal</Label>
          <div className="mt-2 space-y-2">
            {GOAL_OPTIONS.map(g => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="goal"
                  checked={form.goal === g}
                  onChange={() => update("goal", g)}
                  className="accent-primary"
                />
                <span className="text-sm">{g}</span>
              </label>
            ))}
          </div>
          {errors.goal && <p className="text-destructive text-xs mt-1">{errors.goal}</p>}
          {form.goal === "Other" && (
            <div className="mt-2">
              <Input placeholder="Please specify" value={form.goalOther} onChange={(e) => update("goalOther", e.target.value)} className="bg-muted/50 border-border/50" />
              {errors.goalOther && <p className="text-destructive text-xs mt-1">{errors.goalOther}</p>}
            </div>
          )}
        </div>

        <div>
          <Label>Target Geography</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {GEO_OPTIONS.map(g => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.geography.includes(g)}
                  onChange={() => toggleGeo(g)}
                  className="accent-primary"
                />
                <span className="text-sm">{g}</span>
              </label>
            ))}
          </div>
          {errors.geography && <p className="text-destructive text-xs mt-1">{errors.geography}</p>}
          {form.geography.includes("Other") && (
            <div className="mt-2">
              <Input placeholder="Please specify" value={form.geographyOther} onChange={(e) => update("geographyOther", e.target.value)} className="bg-muted/50 border-border/50" />
              {errors.geographyOther && <p className="text-destructive text-xs mt-1">{errors.geographyOther}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleNext} className="gradient-bg hover:opacity-90 h-12 px-8 font-semibold">
          Next Step →
        </Button>
      </div>
    </motion.div>
  );
}
