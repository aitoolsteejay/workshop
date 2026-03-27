import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ArrowLeft } from "lucide-react";

interface Step4Props {
  data: any;
  icpData: any;
  profileData: any;
  onSave: (data: any) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step4ValueProp({ data, icpData, profileData, onSave, onNext, onBack }: Step4Props) {
  const [result, setResult] = useState<any[]>(data?.result || []);
  const [positioning, setPositioning] = useState(data?.positioning || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const offer = profileData?.coreOffer || icpData?.offer || "";
  const icps = icpData?.result || [];

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generate = async () => {
    if (icps.length < 3) { setError("ICP data is missing. Please complete Step 3 first."); return; }
    setError("");
    setLoading(true);
    setResult([]);

    const icpSummary = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).join(", ")}`
    ).join("\n");

    const prompt = `You are a senior B2B strategist. Generate structured Value Propositions for each of these 3 ICPs:

Core Offer: ${offer}
${icpSummary}

For EACH ICP, provide:
1. corePromise: One powerful sentence that captures the transformation (max 15 words)
2. beforeState: What life looks like BEFORE using this solution (3 bullet points)
3. afterState: What life looks like AFTER (3 bullet points)
4. threeStepSystem: Array of 3 steps, each with "step" (name) and "description"
5. whyOthersFail: Why current alternatives fail (2-3 bullet points)
6. whyYouWin: Why this specific approach wins (2-3 bullet points)
7. oneLiner: A ready-to-use one-liner for outreach (max 20 words)
8. shortPitch: A 2-3 sentence elevator pitch
9. cta: A clear call-to-action sentence
10. icpName: The ICP name

Rules:
- Each ICP must feel fundamentally DIFFERENT.
- Ban phrases like "increase growth", "improve results", "scale faster".
- Do NOT use em-dashes or asterisks in any output.
- Return ONLY a valid JSON array of 3 objects (no markdown, no code blocks).`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      let parsed;
      try {
        const match = raw.match(/\[[\s\S]*\]/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      parsed = sanitizeAIOutput(parsed);
      setResult(parsed);
      const p = parsed[0];
      const pos = `We help ${p.icpName} to ${p.corePromise} using a proven system, unlike alternatives which ${p.whyOthersFail?.[0] || "have limited capabilities"}.`;
      setPositioning(pos);
      onSave({ result: parsed, positioning: pos });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyText(text, id)}
      className="ml-2 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
    >
      {copiedField === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Your <span className="accent-text">Value Propositions</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Auto-generated from your ICP data</p>

      {!loading && result.length === 0 && (
        <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate Value Propositions
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating Value Propositions..." />}
      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {result.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex gap-1 mb-6">
            {result.map((vp: any, idx: number) => (
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
              className="space-y-4"
            >
              <div className="glass-card p-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Core Promise</p>
                <p className="text-xl font-bold accent-text">{result[activeTab]?.corePromise}</p>
                <p className="text-sm text-muted-foreground mt-1">{result[activeTab]?.icpName}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">Before</h4>
                  <ul className="space-y-2">
                    {result[activeTab]?.beforeState?.map((b: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-destructive">✗</span>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="glass-card p-5">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">After</h4>
                  <ul className="space-y-2">
                    {result[activeTab]?.afterState?.map((a: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-emerald-400">✓</span>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="glass-card p-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">3-Step System</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {result[activeTab]?.threeStepSystem?.map((step: any, i: number) => (
                    <div key={i} className="bg-secondary p-4 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold accent-bg">{i + 1}</span>
                        <span className="text-sm font-semibold">{step.step}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Why Others Fail</h4>
                  <ul className="space-y-2">
                    {result[activeTab]?.whyOthersFail?.map((f: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">• {f}</li>
                    ))}
                  </ul>
                </div>
                <div className="glass-card p-5">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Why You Win</h4>
                  <ul className="space-y-2">
                    {result[activeTab]?.whyYouWin?.map((w: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-primary">→</span>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="glass-card p-5">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">Ready-to-Use Copy</h4>
                <div className="space-y-3">
                  <div className="bg-secondary p-3 rounded-md flex items-start justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground">One-liner</span>
                      <p className="text-sm font-medium mt-0.5">{result[activeTab]?.oneLiner}</p>
                    </div>
                    <CopyBtn text={result[activeTab]?.oneLiner || ""} id={`oneliner-${activeTab}`} />
                  </div>
                  <div className="bg-secondary p-3 rounded-md flex items-start justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground">Short Pitch</span>
                      <p className="text-sm mt-0.5">{result[activeTab]?.shortPitch}</p>
                    </div>
                    <CopyBtn text={result[activeTab]?.shortPitch || ""} id={`pitch-${activeTab}`} />
                  </div>
                  <div className="bg-secondary p-3 rounded-md flex items-start justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground">CTA</span>
                      <p className="text-sm font-medium accent-text mt-0.5">{result[activeTab]?.cta}</p>
                    </div>
                    <CopyBtn text={result[activeTab]?.cta || ""} id={`cta-${activeTab}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {positioning && (
            <div className="glass-card p-5 mt-6 border-primary">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Core Positioning Statement</h3>
              <p className="text-sm italic text-muted-foreground">"{positioning}"</p>
            </div>
          )}

          <Button onClick={generate} variant="ghost" className="w-full mt-4 text-muted-foreground">Regenerate</Button>
        </motion.div>
      )}

      {result.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : <div />}
          <Button onClick={() => { onSave({ result, positioning }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
