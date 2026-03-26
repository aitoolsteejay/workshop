import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Step6Props {
  data: any;
  icpData: any;
  valuePropData: any;
  onboardingData: any;
  onSave: (data: any) => void;
  onNext: () => void;
}

export function Step6GTM({ data, icpData, valuePropData, onboardingData, onSave, onNext }: Step6Props) {
  const [result, setResult] = useState<any>(data?.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const offer = icpData?.offer || "";
  const icps = icpData?.result || [];
  const vps = valuePropData?.result || [];
  const industry = onboardingData?.industry || "";

  const generate = async () => {
    setError("");
    setLoading(true);
    setResult(null);

    const icpDetail = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).join(", ")}. Goals: ${icp.goalsDesires || ""}`
    ).join("\n");

    const vpDetail = vps.map((vp: any, i: number) =>
      `ICP ${i + 1}: ${vp.icpName}. Method: ${vp.yourMethod}. Angle: ${vp.coreAngle}`
    ).join("\n");

    const prompt = `You are an expert GTM Strategist. Generate a HIGHLY DETAILED, ACTIONABLE Go-To-Market strategy.

Inputs:
- Core Offer: ${offer}
- Industry: ${industry}
- ICPs:
${icpDetail}
- Value Props:
${vpDetail}

Write in PLAIN ENGLISH using SHORT SENTENCES. Use a scannable format.

The strategy must cover:

SECTION 1 — OUTREACH STRATEGY:
For each ICP (label them "ICP 1", "ICP 2", "ICP 3"):
- Recommended channels
- Hook / angle for that ICP
- Channel Tips: Step-by-step tips on HOW to use each channel
- IMPORTANT: Use "LinkedIn Connection Request", "LinkedIn DM", "Cold Email". Do NOT say "LinkedIn message".

SECTION 2 — PARTNER OUTREACH:
- Ideal partners for each ICP
- Partnership models
- Pitch message template
- Value exchange logic

SECTION 3 — EVENT IDEAS:
- 5 event topics tailored to the ICPs (online and offline)

SECTION 4 — LEAD MAGNETS:
Generate EXACTLY 5 lead magnets. Each must be:
- Interactive or results-oriented (a "mini product", NOT a PDF guide or ebook)
- Solvable in under 15 minutes
- Delivering a tangible, specific output

For EACH lead magnet provide:
- name (clear, outcome-based title)
- targetICP (state "For ICP 1 — [Name]", "For ICP 2 — [Name]", or "For ICP 3 — [Name]")
- whatItDoes (1 line)
- userInput (what they enter)
- output (what they get back)
- whyValuable (tied to a specific pain point)
- format (Calculator, Diagnostic Tool, Decision Tool, Generator, or Analyzer)
- cta (clear business next step)

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "outreachStrategy": [{ "icp": string, "channels": [string], "angles": [string], "hooks": [string], "channelTips": [string] }],
  "partnerGrowth": { "idealPartners": [string], "models": [string], "pitch": string, "logic": string },
  "eventGrowth": { "types": [string], "ideas": [string] },
  "leadMagnets": [{ "name": string, "targetICP": string, "whatItDoes": string, "userInput": string, "output": string, "whyValuable": string, "format": string, "cta": string }]
}`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      let parsed;
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch {
        setError("Failed to parse. Try again.");
        setLoading(false);
        return;
      }
      setResult(parsed);
      onSave({ result: parsed });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : (e.message || "Failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Your Go-To-Market Strategy</h2>
      <p className="text-muted-foreground mb-6">A complete, actionable GTM plan</p>

      {!loading && !result && (
        <Button onClick={generate} className="gradient-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate GTM Strategy
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating your GTM strategy..." />}
      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Outreach Strategy */}
          {result.outreachStrategy?.map((os: any, i: number) => (
            <div key={i} className="glass-card p-6">
              <h3 className="text-lg font-bold gradient-text mb-3">ICP {i + 1} — Outreach Strategy</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">📡 Channels</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {os.channels?.map((c: string, j: number) => (
                      <span key={j} className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">🎯 Angles</h4>
                  <ul className="space-y-1 mt-1">{os.angles?.map((a: string, j: number) => <li key={j} className="text-sm text-muted-foreground">• {a}</li>)}</ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">🪝 Hooks</h4>
                  <ul className="space-y-1 mt-1">{os.hooks?.map((h: string, j: number) => <li key={j} className="text-sm text-muted-foreground">• {h}</li>)}</ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">💡 Channel Tips</h4>
                  <ul className="space-y-1 mt-1">{os.channelTips?.map((t: string, j: number) => <li key={j} className="text-sm text-muted-foreground">• {t}</li>)}</ul>
                </div>
              </div>
            </div>
          ))}

          {/* Partners */}
          {result.partnerGrowth && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold gradient-text mb-3">🤝 Partner Outreach</h3>
              <div className="space-y-3">
                <div><h4 className="text-sm font-semibold">Ideal Partners</h4><ul className="mt-1">{result.partnerGrowth.idealPartners?.map((p: string, i: number) => <li key={i} className="text-sm text-muted-foreground">• {p}</li>)}</ul></div>
                <div><h4 className="text-sm font-semibold">Models</h4><ul className="mt-1">{result.partnerGrowth.models?.map((m: string, i: number) => <li key={i} className="text-sm text-muted-foreground">• {m}</li>)}</ul></div>
                <div><h4 className="text-sm font-semibold">Pitch Template</h4><p className="text-sm text-muted-foreground mt-1">{result.partnerGrowth.pitch}</p></div>
                <div><h4 className="text-sm font-semibold">Value Exchange</h4><p className="text-sm text-muted-foreground mt-1">{result.partnerGrowth.logic}</p></div>
              </div>
            </div>
          )}

          {/* Events */}
          {result.eventGrowth && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold gradient-text mb-3">🎪 Event Ideas</h3>
              <ul className="space-y-2">
                {(result.eventGrowth.ideas || result.eventGrowth.types || []).map((e: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Lead Magnets */}
          {result.leadMagnets && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold gradient-text mb-3">🧲 Lead Magnets</h3>
              <div className="space-y-4">
                {result.leadMagnets.map((lm: any, i: number) => (
                  <div key={i} className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm">{lm.name}</h4>
                    <span className="text-xs text-primary">{lm.targetICP}</span>
                    <p className="text-xs text-muted-foreground mt-1"><strong>Format:</strong> {lm.format}</p>
                    <p className="text-xs text-muted-foreground"><strong>What it does:</strong> {lm.whatItDoes}</p>
                    <p className="text-xs text-muted-foreground"><strong>User inputs:</strong> {lm.userInput}</p>
                    <p className="text-xs text-muted-foreground"><strong>Output:</strong> {lm.output}</p>
                    <p className="text-xs text-muted-foreground"><strong>Why valuable:</strong> {lm.whyValuable}</p>
                    <p className="text-xs text-primary mt-1"><strong>CTA:</strong> {lm.cta}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={generate} variant="ghost" className="w-full">Regenerate</Button>
        </motion.div>
      )}

      {result && (
        <div className="mt-8 flex justify-end">
          <Button onClick={() => { onSave({ result }); onNext(); }} className="gradient-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
