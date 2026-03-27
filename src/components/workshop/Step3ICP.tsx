import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "./LoadingSpinner";
import { MultiSelect } from "./MultiSelect";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ArrowLeft } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const INDUSTRIES = [
  "SaaS", "Fintech", "Healthtech", "Edtech", "E-commerce", "D2C", "Agencies",
  "Consulting", "Coaching", "Real Estate", "Manufacturing", "Logistics", "HR Tech",
  "Martech", "Legal", "Finance", "Healthcare", "Recruitment", "IT Services",
  "AI / ML Startups", "B2B Services", "B2B SaaS",
];

const ROLES = [
  "Founder / Co-Founder", "CEO / CXO", "Head of Growth", "Head of Sales",
  "Head of Marketing", "SDR / BDR Manager", "Enterprise Sales Leader",
  "Partnerships Manager", "Operations Head", "Strategy Lead",
];

const SIZES = ["1–10", "10–50", "50–200", "200–500", "500–1000", "1000+"];

interface IcpInput {
  roles: string[];
  sizes: string[];
  industries: string[];
  industryOther: string;
}

interface Step3Props {
  data: any;
  profileData: any;
  onSave: (data: any) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step3ICP({ data, profileData, onSave, onNext, onBack }: Step3Props) {
  const emptyIcp = (): IcpInput => ({ roles: [], sizes: [], industries: [], industryOther: "" });
  const [icps, setIcps] = useState<IcpInput[]>(() => {
    const inputs = data?.inputs || [];
    while (inputs.length < 3) inputs.push(emptyIcp());
    return inputs.map((icp: any) => ({ ...emptyIcp(), ...icp }));
  });
  const [openIcp, setOpenIcp] = useState(0);
  const [result, setResult] = useState<any[]>(data?.result || []);
  const [niche, setNiche] = useState(data?.niche || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Core offer comes from profile data (Step 2) — never re-ask
  const offer = profileData?.coreOffer || data?.offer || "";

  const updateIcp = (idx: number, field: keyof IcpInput, value: any) => {
    setIcps(p => p.map((icp, i) => i === idx ? { ...icp, [field]: value } : icp));
  };

  const getIndustries = (icp: IcpInput) => {
    const selected = icp.industries.filter(x => x !== "Other");
    if (icp.industries.includes("Other") && icp.industryOther) {
      const custom = icp.industryOther.split(",").map(s => s.trim()).filter(Boolean);
      return [...selected, ...custom];
    }
    return selected;
  };

  const generate = async () => {
    if (!offer.trim()) { setError("Core offer is missing. Please complete Step 2 first."); return; }
    for (let i = 0; i < 3; i++) {
      if (icps[i].roles.length === 0) { setError(`ICP ${i + 1}: select at least one role`); return; }
      if (icps[i].sizes.length === 0) { setError(`ICP ${i + 1}: select at least one company size`); return; }
      if (icps[i].industries.length === 0) { setError(`ICP ${i + 1}: select at least one industry`); return; }
    }
    setError("");
    setLoading(true);
    setResult([]);

    const prompt = `You are an expert B2B Growth Strategist. Generate 3 deep, strategic Ideal Customer Profiles (ICPs).

Core Offer: ${offer}
${Array.from({ length: 3 }, (_, i) => `ICP ${i + 1} Inputs: Roles: ${icps[i].roles.filter(x => x !== "Other").join(", ")}, Company Sizes: ${icps[i].sizes.filter(x => x !== "Other").join(", ")}, Industries: ${getIndustries(icps[i]).join(", ")}`).join("\n")}

For EACH ICP generate:
1. ICP Name (descriptive)
2. Who They Are (3-4 bullet points)
3. Core Responsibilities (as a list)
4. Pain Points (at least 5 to 7 specific bullet points)
5. Goals and Desires (as a list)
6. Buying Triggers (as a list)
7. Objections (as a list)
8. Psychology (brief)
9. Where They Hang Out (as a list of platforms)
10. How to Position (messaging angle)

Rules:
- Make each ICP DISTINCT.
- Use specific, believable insights. No generic text.
- Pain Points for all 3 ICPs MUST be filled.
- Do NOT use em-dashes or asterisks in any output.

Return ONLY a valid JSON array of exactly 3 objects (no markdown, no code blocks). Each object must have: name, whoTheyAre (array), coreResponsibilities (array), painPoints (array), goalsDesires (array), buyingTriggers (array), objections (array), psychology (string), whereTheyHangOut (array), howToPosition (string).`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      let parsed;
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      parsed = sanitizeAIOutput(parsed);
      setResult(parsed);
      onSave({ inputs: icps, offer, result: parsed, niche });
      toast({ title: "✓ Saved", description: "ICPs generated and saved", duration: 3000 });
    } catch (e: any) {
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState(0);

  const sections = [
    { key: "whoTheyAre", label: "Who They Are", icon: "👤" },
    { key: "coreResponsibilities", label: "Responsibilities", icon: "📋" },
    { key: "painPoints", label: "Pain Points", icon: "🔥" },
    { key: "goalsDesires", label: "Goals", icon: "🎯" },
    { key: "buyingTriggers", label: "Buying Triggers", icon: "⚡" },
    { key: "objections", label: "Objections", icon: "🛡️" },
    { key: "whereTheyHangOut", label: "Where to Reach", icon: "📍" },
    { key: "howToPosition", label: "Positioning", icon: "💎" },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Define Your <span className="accent-text">Ideal Customers</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Build 3 detailed ICPs for your business</p>

      <div className="space-y-3 mb-6">
        {Array.from({ length: 3 }, (_, idx) => (
          <Collapsible key={idx} open={openIcp === idx} onOpenChange={(open) => open && setOpenIcp(idx)}>
            <CollapsibleTrigger className="w-full">
              <div className={`glass-card p-4 flex items-center justify-between cursor-pointer transition-colors ${openIcp === idx ? "border-primary" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${openIcp === idx ? "accent-bg" : "bg-secondary text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <span className="font-medium text-sm">ICP {idx + 1}</span>
                  {icps[idx].roles.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({icps[idx].roles.length} roles, {icps[idx].sizes.length} sizes, {icps[idx].industries.length} industries)
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openIcp === idx ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="glass-card p-5 mt-1 space-y-4 border-primary">
                <MultiSelect label="Roles" options={ROLES} selected={icps[idx].roles} onChange={v => updateIcp(idx, "roles", v)} hasOther />
                <MultiSelect label="Company Size" options={SIZES} selected={icps[idx].sizes} onChange={v => updateIcp(idx, "sizes", v)} hasOther searchable={false} />
                <MultiSelect
                  label="Industries"
                  options={INDUSTRIES}
                  selected={icps[idx].industries}
                  onChange={v => updateIcp(idx, "industries", v)}
                  hasOther
                  otherValue={icps[idx].industryOther}
                  onOtherChange={v => updateIcp(idx, "industryOther", v)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {!loading && result.length === 0 && (
        <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate ICP Profiles
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating your ICPs... this takes ~20 seconds" />}

      {result.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
          <div className="flex gap-1 mb-4">
            {result.map((icp: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                ICP {idx + 1}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold accent-text mb-6">{result[activeTab]?.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sections.map(s => {
                    const val = result[activeTab]?.[s.key];
                    if (!val) return null;

                    if (s.key === "painPoints" && Array.isArray(val)) {
                      return (
                        <div key={s.key} className="md:col-span-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{s.icon} {s.label}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {val.map((item: string, i: number) => (
                              <div key={i} className="bg-secondary p-3 rounded-md text-sm text-foreground border-l-2 border-primary">{item}</div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // Objections: OPEN by default
                    if (s.key === "objections") {
                      return (
                        <div key={s.key} className="md:col-span-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{s.icon} {s.label}</h4>
                          {Array.isArray(val) ? (
                            <ul className="space-y-1.5 mt-1">
                              {val.map((item: string, i: number) => <li key={i} className="text-sm text-muted-foreground">• {item}</li>)}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">{val}</p>
                          )}
                        </div>
                      );
                    }

                    if (s.key === "whereTheyHangOut" && Array.isArray(val)) {
                      return (
                        <div key={s.key}>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{s.icon} {s.label}</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {val.map((item: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-1 rounded tag-selected border border-primary">{item}</span>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (s.key === "howToPosition") {
                      return (
                        <div key={s.key} className="md:col-span-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{s.icon} {s.label}</h4>
                          <div className="bg-primary/10 border border-primary/30 p-4 rounded-md text-sm text-foreground">{val}</div>
                        </div>
                      );
                    }

                    return (
                      <div key={s.key}>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{s.icon} {s.label}</h4>
                        {Array.isArray(val) ? (
                          <ul className="space-y-1">
                            {val.map((item: string, i: number) => <li key={i} className="text-sm text-muted-foreground">• {item}</li>)}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">{val}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {(!result[activeTab]?.painPoints || result[activeTab].painPoints.length === 0) && (
                  <p className="text-destructive text-sm mt-4">⚠️ Pain points missing for this ICP</p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="glass-card p-5 mt-4">
            <Label className="text-sm text-muted-foreground">Niche Refinement (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">Narrow your niche for the Website Builder step.</p>
            <Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. AI-powered SaaS for HR teams" className="bg-secondary border-border focus:border-primary" />
          </div>

          <Button onClick={generate} variant="ghost" className="w-full mt-4 text-muted-foreground">Regenerate ICPs</Button>
        </motion.div>
      )}

      {result.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : <div />}
          <Button onClick={() => { onSave({ inputs: icps, offer, result, niche }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
