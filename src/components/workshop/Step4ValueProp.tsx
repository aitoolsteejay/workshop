import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Step4Props {
  data: any;
  icpData: any;
  onSave: (data: any) => void;
  onNext: () => void;
}

export function Step4ValueProp({ data, icpData, onSave, onNext }: Step4Props) {
  const [result, setResult] = useState<any[]>(data?.result || []);
  const [positioning, setPositioning] = useState(data?.positioning || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const offer = icpData?.offer || "";
  const icps = icpData?.result || [];

  const generate = async () => {
    if (icps.length < 3) { setError("ICP data is missing. Please complete Step 3 first."); return; }
    setError("");
    setLoading(true);
    setResult([]);

    const icpSummary = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).join(", ")}`
    ).join("\n");

    const prompt = `You are a senior B2B strategist. Generate a structured Value Proposition table for each of these 3 ICPs:

Core Offer: ${offer}
${icpSummary}

For EACH ICP, provide:
- Desired Outcome: Specific, measurable goal (2 lines max)
- Current Problem: The REAL pain they face (2-3 lines)
- Your Method: HOW it actually works (2-3 lines)
- What They Replace: Specific alternatives they currently use
- Core Angle: One clear positioning angle (Authority / ROI / Speed / Trust)
- Why This Wins: Why this mechanism beats alternatives (1-2 lines)

Rules:
- Each ICP must feel fundamentally DIFFERENT.
- Ban phrases like "increase growth", "improve results", "scale faster".
- Return ONLY a valid JSON array of 3 objects (no markdown, no code blocks). Each object: { icpName, desiredOutcome, currentProblem, yourMethod, whatTheyReplace, coreAngle, whyThisWins }`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      let parsed;
      try {
        const match = raw.match(/\[[\s\S]*\]/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch {
        setError("Failed to parse response. Try again.");
        setLoading(false);
        return;
      }
      setResult(parsed);

      // Generate positioning statement
      const p = parsed[0];
      const pos = `We help ${p.icpName} to ${p.desiredOutcome} using ${p.yourMethod}, unlike ${p.whatTheyReplace} which has limited capabilities.`;
      setPositioning(pos);
      onSave({ result: parsed, positioning: pos });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : (e.message || "Failed"));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "desiredOutcome", label: "🎯 Desired Outcome" },
    { key: "currentProblem", label: "🔥 Current Problem" },
    { key: "yourMethod", label: "⚙️ Your Method" },
    { key: "whatTheyReplace", label: "🔄 What They Replace" },
    { key: "coreAngle", label: "📐 Core Angle" },
    { key: "whyThisWins", label: "🏆 Why This Wins" },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Your Value Propositions</h2>
      <p className="text-muted-foreground mb-6">Auto-generated from your ICP data</p>

      {!loading && result.length === 0 && (
        <Button onClick={generate} className="gradient-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate Value Props
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating value propositions..." />}
      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {result.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {result.map((vp: any, idx: number) => (
            <div key={idx} className="glass-card p-6">
              <h3 className="text-lg font-bold gradient-text mb-4">ICP {idx + 1} — {vp.icpName}</h3>
              {fields.map(f => (
                <div key={f.key} className="mb-3">
                  <h4 className="text-sm font-semibold">{f.label}</h4>
                  <p className="text-sm text-muted-foreground">{vp[f.key]}</p>
                </div>
              ))}
            </div>
          ))}

          {positioning && (
            <div className="glass-card p-6 gradient-border">
              <h3 className="font-semibold mb-2">🏛️ Your Core Positioning Statement</h3>
              <p className="text-sm italic text-muted-foreground">"{positioning}"</p>
            </div>
          )}

          <Button onClick={generate} variant="ghost" className="w-full">Regenerate</Button>
        </motion.div>
      )}

      {result.length > 0 && (
        <div className="mt-8 flex justify-end">
          <Button onClick={() => { onSave({ result, positioning }); onNext(); }} className="gradient-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
