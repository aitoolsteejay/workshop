import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { NO_JARGON_RULE, PERSONALISATION_RULE, GEO_AWARENESS_RULE, BUSINESS_TYPE_RULE } from "@/lib/prompt-rules";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Calendar, Users, Presentation, RefreshCw, Zap, AlertTriangle } from "lucide-react";
import { joinField } from "@/lib/utils";

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

type SectionKey = "channels" | "execution" | "magnets";

const SECTION_LABELS: Record<SectionKey, string> = {
  channels: "Generating Channels and Strategy...",
  execution: "Building Execution Plan...",
  magnets: "Creating Lead Magnets and Events...",
};

function parseJSON(raw: string): any | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return null;
  }
}

async function safeGenerate(fn: () => Promise<any>): Promise<any | null> {
  try {
    return await fn();
  } catch (e) {
    console.error("safeGenerate caught:", e);
    return null;
  }
}

export function Step6GTM({ data, icpData, valuePropData, onboardingData, profileData, onSave, onNext, onBack }: Step6Props) {
  const [result, setResult] = useState<any>(data?.result || null);
  const [loading, setLoading] = useState(false);
  const [loadingSection, setLoadingSection] = useState<string>("");
  const [error, setError] = useState("");
  const [activeIcpTab, setActiveIcpTab] = useState(0);
  const [activeModule, setActiveModule] = useState(0);
  const isGenerating = useRef(false);
  const { toast } = useToast();

  const offer = profileData?.coreOffer || icpData?.offer || "";
  const icps = icpData?.result || [];
  const vps = valuePropData?.result || [];
  const industry = onboardingData?.industry || "";
  const businessType = joinField(onboardingData?.businessType);
  const sellingTo = joinField(onboardingData?.sellingTo);

  const inputBlock = useCallback((lite: boolean) => {
    const icpDetail = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).slice(0, lite ? 2 : undefined).join(", ")}. Goals: ${Array.isArray(icp.goalsDesires) ? icp.goalsDesires.slice(0, lite ? 2 : undefined).join(", ") : (icp.goalsDesires || "")}. Geography: ${icp.geographyContext || "Not specified"}`
    ).join("\n");
    const vpDetail = vps.map((vp: any, i: number) =>
      `ICP ${i + 1}: ${vp.icpName || vp.corePromise}. Method: ${vp.corePromise || vp.yourMethod}`
    ).join("\n");
    return `Core Offer: ${offer}\nSelling To: ${sellingTo || "Not specified"}\nBusiness Type: ${businessType || "Not specified"}\nIndustry: ${Array.isArray(industry) ? industry.join(", ") : industry}\nICPs:\n${icpDetail}\nValue Propositions:\n${vpDetail}`;
  }, [icps, vps, offer, industry, businessType, sellingTo]);

  const buildChannelsPrompt = (lite: boolean) => `You are a Growth Strategist. Generate outreach channels and partner strategies per target customer type.

${NO_JARGON_RULE}

${PERSONALISATION_RULE}

${GEO_AWARENESS_RULE}

${BUSINESS_TYPE_RULE}

${inputBlock(lite)}

Return JSON: { "icpStrategies": [{ "icpName": string, "channels": [{ "name": string, "effort": "Low"|"Medium"|"High", "roi": "Low"|"Medium"|"High", "useCase": string, "startHere": boolean, "tips": [${lite ? "2" : "3"} strings] }], "partners": { "types": [{ "type": string, "angle": string, "offer": string, "snippet": string }] } }] }
Rules: No em-dashes, asterisks, or hash signs. Return ONLY valid JSON.`;

  const buildExecutionPrompt = (lite: boolean) => `You are a Growth Strategist. Generate an execution timeline per target customer type.

${NO_JARGON_RULE}

${PERSONALISATION_RULE}

${GEO_AWARENESS_RULE}

${BUSINESS_TYPE_RULE}

${inputBlock(lite)}

Return JSON: { "icpStrategies": [{ "icpName": string, "timeline": [{ "phase": string, "title": string, "tasks": [${lite ? "2-3" : "3-5"} strings] }] }] }
Rules: No em-dashes, asterisks, or hash signs. Return ONLY valid JSON.`;

  const buildMagnetsPrompt = (lite: boolean) => `You are a Growth Strategist. Generate lead magnets and event-led growth strategies per target customer type.

${NO_JARGON_RULE}

${PERSONALISATION_RULE}

${GEO_AWARENESS_RULE}

${BUSINESS_TYPE_RULE}

${inputBlock(lite)}

Return JSON: { "icpStrategies": [{ "icpName": string, "leadMagnets": [{ "name": string, "type": "Audit"|"Report"|"Workshop"|"Calculator"|"Diagnostic", "targetICP": string, "includes": [2-3 strings], "whyItWorks": string, "whenToUse": string, "effort": "Low"|"Medium"|"High", "impact": "Low"|"Medium"|"High", "bestStart": boolean }], "eventLedGrowth": { "onlineEvents": [{ "format": string, "topic": string }], "offlineEvents": [{ "format": string, "topic": string }], "eventFunnel": { "preEvent": string, "duringEvent": string, "postEvent": string }, "conversionStrategy": string } }] }
Rules: No em-dashes, asterisks, or hash signs. Return ONLY valid JSON.`;

  const callSection = async (promptFn: (lite: boolean) => string, label: string, lite: boolean) => {
    setLoadingSection(label);
    const prompt = promptFn(lite);
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 90000));
    const raw = await Promise.race([callGemini(prompt), timeout]) as string;
    const parsed = parseJSON(raw);
    if (!parsed) throw new Error("parse_error");
    return sanitizeAIOutput(parsed);
  };

  const generate = async (lite = false) => {
    if (isGenerating.current) return;
    isGenerating.current = true;
    setError("");
    setLoading(true);
    setLoadingSection(SECTION_LABELS.channels);

    const [channelsResult, executionResult, magnetsResult] = await Promise.all([
      safeGenerate(() => callSection(buildChannelsPrompt, SECTION_LABELS.channels, lite)),
      safeGenerate(() => callSection(buildExecutionPrompt, SECTION_LABELS.execution, lite)),
      safeGenerate(() => callSection(buildMagnetsPrompt, SECTION_LABELS.magnets, lite)),
    ]);

    if (!channelsResult && !executionResult && !magnetsResult && !lite) {
      setLoadingSection("Retrying with simplified prompts...");
      const [chLite, exLite, mgLite] = await Promise.all([
        safeGenerate(() => callSection(buildChannelsPrompt, SECTION_LABELS.channels, true)),
        safeGenerate(() => callSection(buildExecutionPrompt, SECTION_LABELS.execution, true)),
        safeGenerate(() => callSection(buildMagnetsPrompt, SECTION_LABELS.magnets, true)),
      ]);

      if (!chLite && !exLite && !mgLite) {
        setError("all_failed");
        setLoading(false);
        isGenerating.current = false;
        return;
      }

      const merged = mergeResults(chLite, exLite, mgLite);
      setResult(merged);
      onSave({ result: merged });
      toast({ title: "Strategy generated (lite)", duration: 3000 });
      setLoading(false);
      isGenerating.current = false;
      return;
    }

    if (!channelsResult && !executionResult && !magnetsResult) {
      setError("all_failed");
      setLoading(false);
      isGenerating.current = false;
      return;
    }

    const merged = mergeResults(channelsResult, executionResult, magnetsResult);
    setResult(merged);
    onSave({ result: merged });
    toast({ title: "Strategy generated", duration: 3000 });
    setLoading(false);
    isGenerating.current = false;
  };

  const mergeResults = (channels: any, execution: any, magnets: any) => {
    const chStrats = channels?.icpStrategies || [];
    const exStrats = execution?.icpStrategies || [];
    const mgStrats = magnets?.icpStrategies || [];
    const maxLen = Math.max(chStrats.length, exStrats.length, mgStrats.length, icps.length);
    const merged: any[] = [];
    for (let i = 0; i < maxLen; i++) {
      merged.push({
        icpName: chStrats[i]?.icpName || exStrats[i]?.icpName || mgStrats[i]?.icpName || icps[i]?.name || `ICP ${i + 1}`,
        channels: chStrats[i]?.channels || [],
        partners: chStrats[i]?.partners || { types: [] },
        timeline: exStrats[i]?.timeline || [],
        leadMagnets: mgStrats[i]?.leadMagnets || [],
        eventLedGrowth: mgStrats[i]?.eventLedGrowth || null,
      });
    }
    return { icpStrategies: merged };
  };

  const modules = ["Channels", "Timeline", "Partner-Led Growth", "Lead Magnets", "Event-Led Growth"];
  const strategies = result?.icpStrategies || (result?.channels ? [result] : []);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Your <span className="accent-text">Growth Strategy</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">A complete, actionable growth plan per target customer type</p>

      {!loading && !result && !error && (
        <Button onClick={() => generate(false)} disabled={loading} className="accent-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate Growth Strategy
        </Button>
      )}

      {loading && (
        <div className="space-y-3">
          <LoadingSpinner text={loadingSection || "Generating your growth strategy..."} />
          <p className="text-xs text-muted-foreground text-center">Building 3 sections in parallel for faster results</p>
        </div>
      )}

      {error && !loading && !result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">We could not generate your growth strategy</h3>
            <p className="text-sm text-muted-foreground">This can happen due to network or load issues. Please try again.</p>
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
          <div className="flex gap-1 mb-4 overflow-x-auto">
            {strategies.map((s: any, idx: number) => (
              <button key={idx} onClick={() => { setActiveIcpTab(idx); setActiveModule(0); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeIcpTab === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                ICP {idx + 1} {s.icpName ? ` - ${s.icpName}` : ""}
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
                    {activeModule === 0 && (
                      strat.channels && strat.channels.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {strat.channels.map((ch: any, i: number) => (
                            <div key={i} className={`glass-card p-5 ${ch.startHere ? "border-primary" : ""}`}>
                              {ch.startHere && <span className="text-[10px] font-bold accent-bg px-2 py-0.5 rounded mb-2 inline-block">START HERE</span>}
                              <h4 className="text-base font-semibold mb-2">{ch.name}</h4>
                              <div className="flex gap-3 mb-3">
                                <span className="text-xs text-muted-foreground">Effort: <span className="text-foreground">{ch.effort}</span></span>
                                <span className="text-xs text-muted-foreground">ROI: <span className="text-foreground">{ch.roi}</span></span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{ch.useCase}</p>
                              {ch.tips && (
                                <>
                                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                    Channel Tips
                                    <InfoTooltip text="Specific tactics for how to use each outreach channel effectively, tailored to this customer type" />
                                  </h5>
                                  <ul className="space-y-1">
                                    {ch.tips.map((t: string, j: number) => <li key={j} className="text-xs text-muted-foreground">→ {t}</li>)}
                                  </ul>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <SectionUnavailable section="Channels" onRetry={() => generate(false)} />
                      )
                    )}

                    {activeModule === 1 && (
                      strat.timeline && strat.timeline.length > 0 ? (
                        <div className="space-y-4">
                          {strat.timeline.map((phase: any, i: number) => (
                            <div key={i} className="glass-card p-5">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold accent-bg">{i + 1}</span>
                                <div>
                                  <span className="text-xs text-primary font-medium">{phase.phase}</span>
                                  <h4 className="text-base font-semibold">{phase.title}</h4>
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
                      ) : (
                        <SectionUnavailable section="Timeline" onRetry={() => generate(false)} />
                      )
                    )}

                    {activeModule === 2 && (
                      strat.partners?.types && strat.partners.types.length > 0 ? (
                        <div className="space-y-3">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            Partner-Led Growth
                            <InfoTooltip text="Strategy for growing through partnerships with complementary businesses" />
                          </h3>
                          {strat.partners.types.map((p: any, i: number) => (
                            <div key={i} className="glass-card p-5">
                              <h4 className="text-base font-semibold mb-1">{p.type}</h4>
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
                      ) : (
                        <SectionUnavailable section="Partners" onRetry={() => generate(false)} />
                      )
                    )}

                    {activeModule === 3 && (
                      strat.leadMagnets && strat.leadMagnets.length > 0 ? (
                        <div>
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-3">
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
                                <h4 className="text-base font-semibold mt-1 mb-2">{lm.name}</h4>
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
                      ) : (
                        <SectionUnavailable section="Lead Magnets" onRetry={() => generate(false)} />
                      )
                    )}

                    {activeModule === 4 && (
                      strat.eventLedGrowth ? (
                        <div className="space-y-4">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            Event-Led Growth
                            <InfoTooltip text="Using events, online or in-person, to attract, educate, and convert your ideal customers" />
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="glass-card p-5">
                              <h4 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
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
                              <h4 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
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
                              <h4 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
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
                              <h4 className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Conversion Strategy</h4>
                              <p className="text-sm text-muted-foreground">{strat.eventLedGrowth.conversionStrategy}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <SectionUnavailable section="Event-Led Growth" onRetry={() => generate(false)} />
                      )
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

function SectionUnavailable({ section, onRetry }: { section: string; onRetry: () => void }) {
  return (
    <div className="glass-card p-6 text-center space-y-3">
      <p className="text-sm text-muted-foreground">{section} data could not be loaded.</p>
      <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="w-3 h-3" /> Retry
      </Button>
    </div>
  );
}
