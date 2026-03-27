import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Calendar, Users, Presentation, RefreshCw, Zap, AlertTriangle } from "lucide-react";

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
  const isGenerating = useRef(false);
  const { toast } = useToast();

  const offer = profileData?.coreOffer || icpData?.offer || "";
  const icps = icpData?.result || [];
  const vps = valuePropData?.result || [];
  const industry = onboardingData?.industry || "";

  const buildPrompt = (lite = false) => {
    const icpDetail = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).slice(0, lite ? 2 : undefined).join(", ")}. Goals: ${Array.isArray(icp.goalsDesires) ? icp.goalsDesires.slice(0, lite ? 2 : undefined).join(", ") : (icp.goalsDesires || "")}`
    ).join("\n");

    const vpDetail = vps.map((vp: any, i: number) =>
      `ICP ${i + 1}: ${vp.icpName || vp.corePromise}. Method: ${vp.corePromise || vp.yourMethod}`
    ).join("\n");

    if (lite) {
      return `You are a GTM Strategist. Generate a concise Go-To-Market strategy per ICP.

Inputs:
- Core Offer: ${offer}
- Industry: ${Array.isArray(industry) ? industry.join(", ") : industry}
- ICPs:
${icpDetail}
- Value Propositions:
${vpDetail}

Return a JSON object with "icpStrategies" array. Each strategy has: icpName, channels (name, effort, roi, useCase, startHere, tips), timeline (phase, title, tasks), partners (types with type, angle, offer, snippet), leadMagnets (name, type, targetICP, includes, whyItWorks, whenToUse, effort, impact, bestStart), eventLedGrowth (onlineEvents, offlineEvents, eventFunnel with preEvent/duringEvent/postEvent, conversionStrategy).

Rules: No em-dashes, asterisks, or hash signs. Return ONLY valid JSON.`;
    }

    return `You are an expert GTM Strategist. Generate a HIGHLY DETAILED, ACTIONABLE Go-To-Market strategy PER ICP.

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
      "leadMagnets": [{ "name": string, "type": "Audit"|"Report"|"Workshop"|"Calculator"|"Diagnostic", "targetICP": string, "includes": [2-3 strings], "whyItWorks": string, "whenToUse": string, "effort": "Low"|"Medium"|"High", "impact": "Low"|"Medium"|"High", "bestStart": boolean }],
      "eventLedGrowth": {
        "onlineEvents": [{ "format": string, "topic": string }],
        "offlineEvents": [{ "format": string, "topic": string }],
        "eventFunnel": { "preEvent": string, "duringEvent": string, "postEvent": string },
        "conversionStrategy": string
      }
    }
  ]
}

Rules:
- Use "LinkedIn Connection Request", "LinkedIn DM", "Cold Email" terminology.
- Each ICP strategy must be DISTINCT.
- Lead magnets: interactive/results-oriented (NOT ebooks/PDFs). Each must clearly state which ICP it targets.
- Event-Led Growth: 3 online + 3 offline event formats, 3 specific topic ideas, pre/during/post funnel, conversion strategy.
- Do NOT use em-dashes, asterisks, or hash signs.
- Return ONLY valid JSON (no markdown, no code blocks).`;
  };

  const generate = async (lite = false) => {
    if (isGenerating.current) return;
    isGenerating.current = true;
    setError("");
    setLoading(true);

    console.log("GTM API call started", lite ? "(lite)" : "(full)");

    const prompt = buildPrompt(lite);

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 90000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      console.log("GTM API response received");
      let parsed;
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch {
        setError("parse_error");
        setLoading(false);
        isGenerating.current = false;
        return;
      }
      parsed = sanitizeAIOutput(parsed);
      setResult(parsed);
      onSave({ result: parsed });
      toast({ title: "GTM Strategy generated", duration: 3000 });
    } catch (e: any) {
      console.error("GTM generation failed:", e);
      setError(e.message === "timeout" ? "timeout" : "failed");
    } finally {
      setLoading(false);
      isGenerating.current = false;
    }
  };

  const modules = ["Channels", "Timeline", "Partners", "Lead Magnets", "Event-Led Growth"];
  const strategies = result?.icpStrategies || (result?.channels ? [result] : []);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Your <span className="accent-text">GTM Strategy</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">A complete, actionable go-to-market plan per ICP</p>

      {!loading && !result && !error && (
        <Button onClick={() => generate(false)} disabled={loading} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate GTM Strategy
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating your GTM strategy..." />}

      {error && !loading && !result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              {error === "timeout" ? "Generation timed out" : error === "parse_error" ? "Could not process the response" : "We could not generate your GTM strategy"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {error === "timeout" ? "The request took too long. Try the Lite version for faster results." : "This can happen due to network or load issues. Please try again."}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => generate(false)} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
            <Button onClick={() => generate(true)} variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10">
              <Zap className="w-4 h-4" /> Generate Lite Version
            </Button>
          </div>
        </motion.div>
      )}

      {strategies.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex gap-1 mb-4">
            {strategies.map((s: any, idx: number) => (
              <button key={idx} onClick={() => { setActiveIcpTab(idx); setActiveModule(0); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeIcpTab === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                ICP {idx + 1} {s.icpName ? `— ${s.icpName}` : ""}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeIcpTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex gap-1 mb-6 overflow-x-auto">
                {modules.map((m, idx) => (
                  <button key={m} onClick={() => setActiveModule(idx)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeModule === idx ? "bg-secondary text-foreground border border-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
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
                            {ch.startHere && <span className="text-[10px] font-bold accent-bg px-2 py-0.5 rounded mb-2 inline-block">START HERE</span>}
                            <h4 className="font-semibold text-sm mb-2">{ch.name}</h4>
                            <div className="flex gap-3 mb-3">
                              <span className="text-xs text-muted-foreground">Effort: <span className="text-foreground">{ch.effort}</span></span>
                              <span className="text-xs text-muted-foreground">ROI: <span className="text-foreground">{ch.roi}</span></span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">{ch.useCase}</p>
                            {ch.tips && (
                              <ul className="space-y-1">
                                {ch.tips.map((t: string, j: number) => <li key={j} className="text-xs text-muted-foreground">→ {t}</li>)}
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
                                <li key={j} className="text-sm text-muted-foreground flex gap-2"><span className="text-muted-foreground/50">•</span>{task}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeModule === 2 && strat.partners?.types && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          Partner Outreach
                          <InfoTooltip text="Strategy for growing through partnerships with complementary businesses" />
                        </h3>
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
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-3">
                          Lead Magnets
                          <InfoTooltip text="High-value free resources used to attract prospects and start conversations without cold pitching" />
                        </h3>
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
                                    <li key={j} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-primary">•</span>{item}</li>
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
                      </div>
                    )}

                    {activeModule === 4 && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          Event-Led Growth
                          <InfoTooltip text="Using events (online or offline) to attract, warm up, and convert your ICPs" />
                        </h3>

                        {strat.eventLedGrowth ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="glass-card p-5">
                                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Presentation className="w-3.5 h-3.5" /> Online Events
                                </h4>
                                {strat.eventLedGrowth.onlineEvents?.map((ev: any, i: number) => (
                                  <div key={i} className="bg-secondary p-3 rounded-md mb-2">
                                    <span className="text-[10px] text-primary font-medium uppercase">{ev.format}</span>
                                    <p className="text-sm mt-0.5">{ev.topic}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="glass-card p-5">
                                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Users className="w-3.5 h-3.5" /> Offline Events
                                </h4>
                                {strat.eventLedGrowth.offlineEvents?.map((ev: any, i: number) => (
                                  <div key={i} className="bg-secondary p-3 rounded-md mb-2">
                                    <span className="text-[10px] text-primary font-medium uppercase">{ev.format}</span>
                                    <p className="text-sm mt-0.5">{ev.topic}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {strat.eventLedGrowth.eventFunnel && (
                              <div className="glass-card p-5">
                                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5" /> Event Funnel
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {["preEvent", "duringEvent", "postEvent"].map((phase, i) => (
                                    <div key={phase} className="bg-secondary p-4 rounded-md">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold accent-bg">{i + 1}</span>
                                        <span className="text-xs font-semibold capitalize">{phase === "preEvent" ? "Pre-Event" : phase === "duringEvent" ? "During Event" : "Post-Event"}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{strat.eventLedGrowth.eventFunnel[phase]}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {strat.eventLedGrowth.conversionStrategy && (
                              <div className="glass-card p-5">
                                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Conversion Strategy</h4>
                                <p className="text-sm text-muted-foreground">{strat.eventLedGrowth.conversionStrategy}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="glass-card p-5 text-center">
                            <p className="text-sm text-muted-foreground">Event-Led Growth data not available. Try regenerating.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>

          <Button onClick={() => generate(false)} disabled={loading} variant="ghost" className="w-full mt-6 text-muted-foreground">Regenerate</Button>
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
