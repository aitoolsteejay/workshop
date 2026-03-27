import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star } from "lucide-react";

interface Step6Props {
  data: any;
  icpData: any;
  valuePropData: any;
  onboardingData: any;
  profileData: any;
  onSave: (data: any) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step6GTM({ data, icpData, valuePropData, onboardingData, profileData, onSave, onNext, onBack }: Step6Props) {
  const [result, setResult] = useState<any>(data?.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIcpTab, setActiveIcpTab] = useState(0);
  const [activeModule, setActiveModule] = useState(0);
  const { toast } = useToast();

  const offer = profileData?.coreOffer || icpData?.offer || "";
  const icps = icpData?.result || [];
  const vps = valuePropData?.result || [];
  const industry = onboardingData?.industry || "";

  const generate = async () => {
    setError("");
    setLoading(true);
    setResult(null);

    const icpDetail = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).join(", ")}. Goals: ${Array.isArray(icp.goalsDesires) ? icp.goalsDesires.join(", ") : (icp.goalsDesires || "")}`
    ).join("\n");

    const vpDetail = vps.map((vp: any, i: number) =>
      `ICP ${i + 1}: ${vp.icpName || vp.corePromise}. Method: ${vp.corePromise || vp.yourMethod}`
    ).join("\n");

    const prompt = `You are an expert GTM Strategist. Generate a HIGHLY DETAILED, ACTIONABLE Go-To-Market strategy PER ICP.

Inputs:
- Core Offer: ${offer}
- Industry: ${Array.isArray(industry) ? industry.join(", ") : industry}
- ICPs:
${icpDetail}
- Value Propositions:
${vpDetail}

Generate a separate GTM strategy for EACH of the 3 ICPs. Return a JSON object:

{
  "icpStrategies": [
    {
      "icpName": string,
      "channels": [{ "name": string, "effort": "Low"|"Medium"|"High", "roi": "Low"|"Medium"|"High", "useCase": string, "startHere": boolean, "tips": [3 strings] }],
      "timeline": [{ "phase": string, "title": string, "tasks": [strings] }],
      "partners": { "types": [{ "type": string, "angle": string, "offer": string, "snippet": string }] },
      "leadMagnets": [{ "name": string, "type": "Audit"|"Report"|"Workshop"|"Calculator"|"Diagnostic", "targetICP": string, "includes": [2-3 strings], "whyItWorks": string, "whenToUse": string, "effort": "Low"|"Medium"|"High", "impact": "Low"|"Medium"|"High", "bestStart": boolean }]
    }
  ]
}

Rules:
- Use "LinkedIn Connection Request", "LinkedIn DM", "Cold Email" terminology.
- Each ICP strategy must be DISTINCT.
- Lead magnets: interactive/results-oriented (NOT ebooks/PDFs). Each must clearly state which ICP it targets.
- Do NOT use em-dashes or asterisks.
- Return ONLY valid JSON (no markdown, no code blocks).`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      let parsed;
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      parsed = sanitizeAIOutput(parsed);
      setResult(parsed);
      onSave({ result: parsed });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const modules = ["Channels", "Timeline", "Partners", "Lead Magnets"];
  const strategies = result?.icpStrategies || (result?.channels ? [result] : []);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Your <span className="accent-text">GTM Strategy</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">A complete, actionable go-to-market plan per ICP</p>

      {!loading && !result && (
        <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate GTM Strategy
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating your GTM strategy..." />}
      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {strategies.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* ICP Tabs */}
          <div className="flex gap-1 mb-4">
            {strategies.map((s: any, idx: number) => (
              <button
                key={idx}
                onClick={() => { setActiveIcpTab(idx); setActiveModule(0); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeIcpTab === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                ICP {idx + 1} {s.icpName ? `— ${s.icpName}` : ""}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeIcpTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Module Tabs */}
              <div className="flex gap-1 mb-6 overflow-x-auto">
                {modules.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => setActiveModule(idx)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                      activeModule === idx ? "bg-secondary text-foreground border border-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {(() => {
                const strat = strategies[activeIcpTab];
                if (!strat) return null;

                return (
                  <>
                    {activeModule === 0 && strat.channels && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {strat.channels.map((ch: any, i: number) => (
                          <div key={i} className={`glass-card p-5 ${ch.startHere ? "border-primary" : ""}`}>
                            {ch.startHere && (
                              <span className="text-[10px] font-bold accent-bg px-2 py-0.5 rounded mb-2 inline-block">START HERE</span>
                            )}
                            <h4 className="font-semibold text-sm mb-2">{ch.name}</h4>
                            <div className="flex gap-3 mb-3">
                              <span className="text-xs text-muted-foreground">Effort: <span className="text-foreground">{ch.effort}</span></span>
                              <span className="text-xs text-muted-foreground">ROI: <span className="text-foreground">{ch.roi}</span></span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">{ch.useCase}</p>
                            {ch.tips && (
                              <ul className="space-y-1">
                                {ch.tips.map((t: string, j: number) => (
                                  <li key={j} className="text-xs text-muted-foreground">→ {t}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {activeModule === 1 && strat.timeline && (
                      <div className="space-y-4">
                        {strat.timeline.map((phase: any, i: number) => (
                          <div key={i} className="glass-card p-5">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold accent-bg">{i + 1}</span>
                              <div>
                                <span className="text-xs text-primary font-medium">{phase.phase}</span>
                                <h4 className="font-semibold text-sm">{phase.title}</h4>
                              </div>
                            </div>
                            <ul className="space-y-1.5 ml-11">
                              {phase.tasks?.map((task: string, j: number) => (
                                <li key={j} className="text-sm text-muted-foreground flex gap-2">
                                  <span className="text-muted-foreground/50">•</span>{task}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeModule === 2 && strat.partners?.types && (
                      <div className="space-y-3">
                        {strat.partners.types.map((p: any, i: number) => (
                          <div key={i} className="glass-card p-5">
                            <h4 className="font-semibold text-sm mb-1">{p.type}</h4>
                            <div className="space-y-2 mt-3">
                              <div><span className="text-xs text-muted-foreground">Angle:</span> <span className="text-sm">{p.angle}</span></div>
                              <div><span className="text-xs text-muted-foreground">Offer:</span> <span className="text-sm">{p.offer}</span></div>
                              {p.snippet && (
                                <div className="bg-secondary p-3 rounded-md mt-2">
                                  <span className="text-xs text-muted-foreground">Copy snippet:</span>
                                  <p className="text-sm mt-1 italic">"{p.snippet}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeModule === 3 && strat.leadMagnets && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {strat.leadMagnets.map((lm: any, i: number) => (
                          <div key={i} className={`glass-card p-5 relative ${lm.bestStart ? "border-primary" : ""}`}>
                            {lm.bestStart && (
                              <div className="absolute -top-2 left-4 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded">
                                <Star className="w-3 h-3" /> Best Starting Point
                              </div>
                            )}
                            <span className="text-[10px] font-medium text-primary uppercase">{lm.type || lm.format}</span>
                            <h4 className="font-semibold text-sm mt-1 mb-2">{lm.name}</h4>
                            <p className="text-xs text-muted-foreground mb-2 accent-text">For {strat.icpName || `ICP ${activeIcpTab + 1}`}</p>

                            {lm.includes && (
                              <ul className="space-y-1 mb-3">
                                {lm.includes.map((item: string, j: number) => (
                                  <li key={j} className="text-xs text-muted-foreground flex gap-1.5">
                                    <span className="text-primary">•</span>{item}
                                  </li>
                                ))}
                              </ul>
                            )}

                            {lm.whyItWorks && (
                              <div className="mb-2">
                                <span className="text-[10px] text-muted-foreground uppercase">Why it works</span>
                                <p className="text-xs text-muted-foreground">{lm.whyItWorks}</p>
                              </div>
                            )}

                            {lm.whenToUse && (
                              <div className="mb-2">
                                <span className="text-[10px] text-muted-foreground uppercase">When to use</span>
                                <p className="text-xs text-muted-foreground">{lm.whenToUse}</p>
                              </div>
                            )}

                            <div className="flex gap-3 mt-3 pt-2 border-t border-border">
                              <span className="text-xs text-muted-foreground">Effort: <span className="text-foreground">{lm.effort || "Medium"}</span></span>
                              <span className="text-xs text-muted-foreground">Impact: <span className="text-foreground">{lm.impact || "High"}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>

          <Button onClick={generate} variant="ghost" className="w-full mt-6 text-muted-foreground">Regenerate</Button>
        </motion.div>
      )}

      {strategies.length > 0 && (
        <div className="mt-8 flex items-center justify-between">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : <div />}
          <Button onClick={() => { onSave({ result }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
