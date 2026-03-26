import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  "SaaS", "Fintech", "Healthtech", "Edtech", "E-commerce", "D2C", "Agencies",
  "Consulting", "Coaching", "Real Estate", "Manufacturing", "Logistics", "HR Tech",
  "Martech", "Legal", "Finance", "Healthcare", "Recruitment", "IT Services",
  "AI / ML Startups", "B2B Services", "B2B SaaS", "Other"
];

const ROLES = [
  "Founder / Co-Founder", "CEO / CXO", "Head of Growth", "Head of Sales",
  "Head of Marketing", "SDR / BDR Manager", "Enterprise Sales Leader",
  "Partnerships Manager", "Operations Head", "Strategy Lead", "Other"
];

const SIZES = ["1–10", "10–50", "50–200", "200–500", "500–1000", "1000+", "Other"];

interface IcpInput {
  roles: string[];
  sizes: string[];
  industries: string[];
}

interface Step3Props {
  data: any;
  onSave: (data: any) => void;
  onNext: () => void;
}

function CheckboxGroup({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => {
    onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o]);
  };
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map(o => (
          <label key={o} className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${selected.includes(o) ? "gradient-bg border-transparent text-primary-foreground" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}>
            <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

export function Step3ICP({ data, onSave, onNext }: Step3Props) {
  const emptyIcp = (): IcpInput => ({ roles: [], sizes: [], industries: [] });
  const [icps, setIcps] = useState<IcpInput[]>(data?.inputs || [emptyIcp(), emptyIcp(), emptyIcp()]);
  const [offer, setOffer] = useState(data?.offer || "");
  const [result, setResult] = useState<any[]>(data?.result || []);
  const [niche, setNiche] = useState(data?.niche || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const updateIcp = (idx: number, field: keyof IcpInput, value: string[]) => {
    setIcps(p => p.map((icp, i) => i === idx ? { ...icp, [field]: value } : icp));
  };

  const generate = async () => {
    if (!offer.trim()) { setError("Please enter your core offer"); return; }
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
ICP 1 Inputs: Roles: ${icps[0].roles.join(", ")}, Company Sizes: ${icps[0].sizes.join(", ")}, Industries: ${icps[0].industries.join(", ")}
ICP 2 Inputs: Roles: ${icps[1].roles.join(", ")}, Company Sizes: ${icps[1].sizes.join(", ")}, Industries: ${icps[1].industries.join(", ")}
ICP 3 Inputs: Roles: ${icps[2].roles.join(", ")}, Company Sizes: ${icps[2].sizes.join(", ")}, Industries: ${icps[2].industries.join(", ")}

For EACH ICP generate:
1. ICP Name (descriptive, e.g. "Scaling SaaS Growth Leader")
2. Who They Are
3. Core Responsibilities
4. Pain Points (at least 5 to 7 specific bullet points)
5. Goals and Desires
6. Buying Triggers
7. Objections
8. Psychology
9. Where They Hang Out
10. How to Position

Rules:
- Make each ICP DISTINCT.
- Use specific, believable insights. No generic text.
- Pain Points for all 3 ICPs MUST be filled.

Return ONLY a valid JSON array of exactly 3 objects (no markdown, no code blocks). Each object must have: name, whoTheyAre, coreResponsibilities, painPoints (array), goalsDesires, buyingTriggers, objections, psychology, whereTheyHangOut, howToPosition.`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      let parsed;
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        setError("Failed to parse AI response. Please try again.");
        setLoading(false);
        return;
      }
      setResult(parsed);
      onSave({ inputs: icps, offer, result: parsed, niche });
      toast({ title: "✓ Saved", description: "ICPs generated and saved", duration: 3000 });
    } catch (e: any) {
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : (e.message || "Failed"));
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { key: "whoTheyAre", emoji: "👤", label: "Who They Are" },
    { key: "coreResponsibilities", emoji: "📋", label: "Core Responsibilities" },
    { key: "painPoints", emoji: "🎯", label: "Pain Points" },
    { key: "goalsDesires", emoji: "💡", label: "Goals & Desires" },
    { key: "buyingTriggers", emoji: "🔔", label: "Buying Triggers" },
    { key: "objections", emoji: "🚧", label: "Objections" },
    { key: "psychology", emoji: "🧠", label: "Psychology" },
    { key: "whereTheyHangOut", emoji: "📍", label: "Where They Hang Out" },
    { key: "howToPosition", emoji: "🎪", label: "How to Position" },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Define Your Ideal Customer Profiles</h2>
      <p className="text-muted-foreground mb-6">Build 3 detailed ICPs for your business</p>

      {[0, 1, 2].map(idx => (
        <div key={idx} className="glass-card p-6 mb-4">
          <h3 className="font-semibold mb-3 gradient-text">ICP {idx + 1}</h3>
          <div className="space-y-3">
            <CheckboxGroup label="Roles" options={ROLES} selected={icps[idx].roles} onChange={v => updateIcp(idx, "roles", v)} />
            <CheckboxGroup label="Company Sizes" options={SIZES} selected={icps[idx].sizes} onChange={v => updateIcp(idx, "sizes", v)} />
            <CheckboxGroup label="Industries" options={INDUSTRIES} selected={icps[idx].industries} onChange={v => updateIcp(idx, "industries", v)} />
          </div>
        </div>
      ))}

      <div className="glass-card p-6 mb-4">
        <Label>Core Offer / What you sell *</Label>
        <Textarea value={offer} onChange={e => setOffer(e.target.value)} placeholder="e.g. We help B2B companies generate leads via LinkedIn outreach and cold email" className="mt-1.5 bg-muted/50 border-border/50" />
      </div>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {!loading && result.length === 0 && (
        <Button onClick={generate} className="gradient-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate ICP Profiles
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating your ICPs... this takes ~20 seconds" />}

      {result.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-6">
          {result.map((icp: any, idx: number) => (
            <div key={idx} className="glass-card p-6">
              <h3 className="text-xl font-bold gradient-text mb-4">ICP {idx + 1} — {icp.name}</h3>
              {sections.map(s => {
                const val = icp[s.key];
                if (!val) return null;
                return (
                  <div key={s.key} className="mb-4">
                    <h4 className="font-semibold text-sm mb-1">{s.emoji} {s.label}</h4>
                    {Array.isArray(val) ? (
                      <ul className="space-y-1">
                        {val.map((item: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">• {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{val}</p>
                    )}
                  </div>
                );
              })}
              {(!icp.painPoints || icp.painPoints.length === 0) && (
                <p className="text-destructive text-sm">⚠️ Pain points missing for this ICP</p>
              )}
            </div>
          ))}

          <div className="glass-card p-6">
            <Label>Niche Refinement (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">Want to narrow your niche? This will be used in the Website Builder step.</p>
            <Input value={niche} onChange={e => { setNiche(e.target.value); }} placeholder="e.g. AI-powered SaaS for HR teams" className="bg-muted/50 border-border/50" />
          </div>

          <Button onClick={generate} variant="ghost" className="w-full">Regenerate ICPs</Button>
        </motion.div>
      )}

      {result.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button onClick={() => { onSave({ inputs: icps, offer, result, niche }); onNext(); }} className="gradient-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
