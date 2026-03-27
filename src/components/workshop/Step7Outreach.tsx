import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle, Video, Clock, ExternalLink, Wrench, ShieldAlert } from "lucide-react";

const ANGLES = ["Authority", "ROI", "Pain-led", "Contrarian", "Curiosity", "Offer-led"];

const TOUCHPOINTS = [
  {
    num: 1, title: "Warm Up",
    action: "Like or comment genuinely on their recent post",
    purpose: "Get on their radar before connecting",
    timing: "1-3 days before sending connection request",
    rule: "Comment must be specific to the post. Never generic.",
  },
  {
    num: 2, title: "Connection Request",
    action: "Send with a short personalised note under 300 characters",
    purpose: "Start the relationship with context",
    timing: "After warm-up engagement",
    rule: "No pitch. No \"I'd love to connect.\" Reference something specific about them.",
  },
  {
    num: 3, title: "Message 1",
    action: "First DM, 3-4 lines maximum",
    purpose: "Open conversation using selected angle",
    timing: "Day 1-2 after accepted",
    rule: "Super short. Not salesy. No offer mention. Personalise with name, company, and something specific.",
  },
  {
    num: 4, title: "Warm Engagement",
    action: "Comment on another of their posts",
    purpose: "Stay visible without being pushy",
    timing: "Day 3-5, if no reply",
    rule: "Always specific. Never say \"great post.\"",
  },
  {
    num: 5, title: "Message 2 with Loom / Voice Note",
    action: "Send a Loom video or LinkedIn voice note",
    purpose: "Break pattern and build trust with personalised content",
    timing: "Day 6-8",
    rule: "Mention their name. Get to the point in 20 seconds.",
  },
  {
    num: 6, title: "Message 3 with Lead Magnet",
    action: "Offer the most relevant lead magnet for this ICP",
    purpose: "Deliver real value, lower resistance",
    timing: "Day 10-14",
    rule: "Frame as a gift, not a bait. If they engage, follow up quickly.",
  },
  {
    num: 7, title: "Final Follow-Up",
    action: "Close the loop with a new insight or graceful breakup",
    purpose: "Give them a final reason or exit gracefully",
    timing: "Day 16-20",
    rule: "If not interested, let them go. Offer the lead magnet as a parting value piece.",
  },
  {
    num: 8, title: "Email Fallback",
    action: "Find work email via Apollo.io, send 2-3 short emails referencing LinkedIn outreach",
    purpose: "Reach them on a different channel",
    timing: "After LinkedIn sequence ends with no response",
    rule: "Max 3 emails. 3-5 lines each. Do not spam.",
  },
];

const TOOLS = [
  {
    name: "CLAY",
    url: "https://clay.com",
    desc: "Pulls live data about prospects: recent posts, job changes, company news. Use to personalise your first message.",
    example: "\"Saw you just expanded your team, here's something useful for your outreach right now.\"",
  },
  {
    name: "CALENDLY",
    url: "https://calendly.com/founder-myntmore/30min",
    desc: "Always include your booking link in any CTA message. Send a direct booking link. Never ask them to reply with their availability, it creates friction.",
    example: null,
  },
  {
    name: "APOLLO",
    url: "https://apollo.io",
    desc: "Use to find work emails when LinkedIn gets no response. Free tier available. Search by name + company name.",
    example: null,
  },
];

const MESSAGE_RULES = [
  "Every message must be under 5 lines",
  "No corporate jargon",
  "No \"I hope this finds you well\"",
  "No long service explanations",
  "Always use their name and company name",
  "End with a question or a clear next step",
  "Do not use all 8 touchpoints with every prospect, test one sequence at a time",
  "If someone says no, let them go",
];

const SEQUENCES = [
  {
    name: "Curiosity-led",
    steps: [
      { touch: 1, type: "Connection", intent: "Pattern-interrupt curiosity" },
      { touch: 2, type: "Follow-up", intent: "Curiosity hook" },
      { touch: 3, type: "Follow-up", intent: "Insight or observation" },
      { touch: 4, type: "Follow-up", intent: "Soft CTA" },
    ],
  },
  {
    name: "Insight-led",
    steps: [
      { touch: 1, type: "Connection", intent: "Relevant observation" },
      { touch: 2, type: "Follow-up", intent: "Industry insight" },
      { touch: 3, type: "Follow-up", intent: "Case study proof" },
      { touch: 4, type: "Follow-up", intent: "Direct CTA" },
    ],
  },
  {
    name: "Multi-format",
    steps: [
      { touch: 1, type: "Connection", intent: "Personalized observation" },
      { touch: 2, type: "Follow-up", intent: "Value-add content" },
      { touch: 3, type: "Loom / Voice", intent: "Personalized walkthrough" },
      { touch: 4, type: "Follow-up", intent: "Lead magnet offer" },
    ],
  },
];

interface Step7Props {
  data: any;
  icpData: any;
  valuePropData: any;
  profileData: any;
  onboardingData: any;
  onSave: (data: any) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step7Outreach({ data, icpData, valuePropData, profileData, onboardingData, onSave, onNext, onBack }: Step7Props) {
  const [angle, setAngle] = useState(data?.angle || "Authority");
  const [result, setResult] = useState<any>(data?.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const { toast } = useToast();
  const generationIdRef = useRef(0);

  const offer = profileData?.coreOffer || icpData?.offer || "";
  const icps = icpData?.result || [];
  const vps = valuePropData?.result || [];
  const userName = profileData?.role ? `${profileData.role} at ${profileData.company}` : "";
  const industry = onboardingData?.industry || "";

  const generate = useCallback(async () => {
    const currentGenId = ++generationIdRef.current;
    setError("");
    setLoading(true);
    setResult(null);

    const icpSummary = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).slice(0, 4).join(", ")}. Psychology: ${icp.psychology || ""}. Where: ${Array.isArray(icp.whereTheyHangOut) ? icp.whereTheyHangOut.join(", ") : ""}`
    ).join("\n");

    const topVP = vps[0] ? `${vps[0].corePromise || vps[0].desiredOutcome}` : offer;

    const prompt = `You are a world-class B2B Outreach Strategist. Generate a STRATEGIC OUTREACH PLAYBOOK (not scripts or templates).

- Client: ${userName}
- Offer: ${offer}
- Value Proposition: ${topVP}
- Industry: ${Array.isArray(industry) ? industry.join(", ") : industry}
- Selected Angle: ${angle}
- ICPs:
${icpSummary}

For EACH of the 3 ICPs, generate a strategic playbook with these sections:

1. "icpContext": { "who": string, "mindset": string, "careAbout": [3 strings], "ignore": [3 strings] }

2. "strategicApproach": { "bestAngle": string, "positioningStyle": string (peer/expert/challenger/insider), "whatNotToDo": [3 strings] }

3. "touchpointStrategy": {
  "compliment": { "when": string, "type": string, "avoid": string },
  "voiceNote": { "stage": string, "whyItWorks": string, "tone": string },
  "loom": { "trigger": string, "content": string, "personalization": string },
  "caseStudy": { "trustStage": string, "typeOfProof": string, "format": string },
  "leadMagnet": { "timing": string, "type": string, "conversionMoment": string },
  "curiosity": { "hooks": [3 strings], "infoGaps": [2 strings], "psychTriggers": [2 strings] }
}

4. "followUpSystem": { "totalTouches": number (5-8), "delayDays": [array of numbers], "escalationLogic": string, "toneEvolution": string }

5. "messageDistribution": [array of objects with "touch" (number) and "type" (string)]

6. "whatToAvoid": [4-5 specific mistakes for this ICP]

IMPORTANT: Do NOT use em-dashes or asterisks in any output.

Return ONLY valid JSON (no markdown):
{
  "playbooks": [
    { "icpName": string, "icpContext": ..., "strategicApproach": ..., "touchpointStrategy": ..., "followUpSystem": ..., "messageDistribution": [...], "whatToAvoid": [...] },
    ... (3 total)
  ]
}`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      if (currentGenId !== generationIdRef.current) return;

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
      onSave({ angle, result: parsed });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      if (currentGenId !== generationIdRef.current) return;
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : "Something went wrong. Please try again.");
    } finally {
      if (currentGenId === generationIdRef.current) setLoading(false);
    }
  }, [angle, offer, icps, vps, userName, industry, onSave, toast]);

  const playbooks = result?.playbooks || [];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Strategic <span className="accent-text">Outreach</span> Playbook</h2>
      <p className="text-muted-foreground mb-8 text-sm">Tactical, psychological outreach strategy per ICP</p>

      <div className="glass-card p-5 mb-6">
        <label className="text-sm text-muted-foreground">Outreach Angle</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ANGLES.map(a => (
            <button
              key={a}
              onClick={() => setAngle(a)}
              className={`text-sm px-4 py-2 rounded-md border transition-all ${
                angle === a ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold mt-4">
          {result ? "Regenerate Playbook" : "Generate Outreach Playbook"}
        </Button>
      </div>

      {loading && <LoadingSpinner text="Building your outreach playbook..." />}
      {error && (
        <div className="glass-card p-5 mb-4 text-center">
          <p className="text-destructive text-sm mb-3">{error}</p>
          <Button onClick={generate} variant="ghost" className="text-muted-foreground">Retry</Button>
        </div>
      )}

      {playbooks.length > 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* ICP Tabs */}
          <div className="flex gap-1">
            {playbooks.map((pb: any, idx: number) => (
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
              {(() => {
                const pb = playbooks[activeTab];
                if (!pb) return null;
                return (
                  <>
                    {/* ICP Context */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">🎯 ICP Context, {pb.icpName}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">Who they are</span>
                          <p className="text-sm mt-0.5">{pb.icpContext?.who}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Mindset</span>
                          <p className="text-sm mt-0.5">{pb.icpContext?.mindset}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">They care about</span>
                          <ul className="mt-1 space-y-0.5">
                            {pb.icpContext?.careAbout?.map((c: string, i: number) => (
                              <li key={i} className="text-sm text-emerald-400">✓ {c}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">They ignore</span>
                          <ul className="mt-1 space-y-0.5">
                            {pb.icpContext?.ignore?.map((c: string, i: number) => (
                              <li key={i} className="text-sm text-destructive">✗ {c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Strategic Approach */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">🧠 Strategic Approach</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                        <div className="bg-secondary p-3 rounded-md">
                          <span className="text-xs text-muted-foreground">Best Angle</span>
                          <p className="text-sm font-semibold accent-text mt-0.5">{pb.strategicApproach?.bestAngle}</p>
                        </div>
                        <div className="bg-secondary p-3 rounded-md">
                          <span className="text-xs text-muted-foreground">Positioning Style</span>
                          <p className="text-sm font-semibold mt-0.5">{pb.strategicApproach?.positioningStyle}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">What NOT to do</span>
                        <ul className="mt-1 space-y-1">
                          {pb.strategicApproach?.whatNotToDo?.map((w: string, i: number) => (
                            <li key={i} className="text-sm text-destructive/80">✗ {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Full 8-Step Outreach Flow */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">📋 8-Step Outreach Flow</h3>
                      <div className="bg-primary/10 border border-primary/20 rounded-md p-3 mb-4 flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Don't use all touchpoints in one sequence</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Test combinations: Text only → Text + Loom → Text + case study. Too many elements = spam = lower replies.</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {TOUCHPOINTS.map((tp) => (
                          <div key={tp.num} className="bg-secondary p-4 rounded-md">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold accent-bg shrink-0">{tp.num}</span>
                              <h4 className="text-sm font-semibold">{tp.title}</h4>
                            </div>
                            <div className="ml-10 space-y-1.5">
                              <div><span className="text-xs text-muted-foreground">Action:</span> <span className="text-sm">{tp.action}</span></div>
                              <div><span className="text-xs text-muted-foreground">Purpose:</span> <span className="text-sm">{tp.purpose}</span></div>
                              <div><span className="text-xs text-muted-foreground">Timing:</span> <span className="text-sm">{tp.timing}</span></div>
                              <div className="mt-1 pt-1 border-t border-border/50"><span className="text-xs text-primary">Rule:</span> <span className="text-xs text-muted-foreground">{tp.rule}</span></div>
                            </div>
                            {tp.num === 5 && (
                              <div className="ml-10 mt-3 bg-card p-3 rounded-md border border-border">
                                <div className="flex items-center gap-2 mb-1">
                                  <Video className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-xs font-semibold text-primary">What is Loom?</span>
                                </div>
                                <p className="text-xs text-muted-foreground">A 1-3 minute personalised screen recording (loom.com, free). Show something relevant to them: their website, a quick audit, a useful insight. Talk directly to them. Casual and direct. Not overproduced.</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Touchpoint Strategy (AI-generated) */}
                    {pb.touchpointStrategy && (
                      <div className="glass-card p-5">
                        <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">💬 ICP-Specific Touchpoint Insights</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(pb.touchpointStrategy).map(([key, val]: [string, any]) => {
                            if (!val) return null;
                            const labels: Record<string, string> = {
                              compliment: "Compliment Strategy",
                              voiceNote: "Voice Note",
                              loom: "Loom Video",
                              caseStudy: "Case Study",
                              leadMagnet: "Lead Magnet",
                              curiosity: "Building Curiosity",
                            };
                            return (
                              <div key={key} className="bg-secondary p-3 rounded-md">
                                <span className="text-xs font-semibold text-primary">{labels[key] || key}</span>
                                <div className="mt-1.5 space-y-1">
                                  {typeof val === "object" && !Array.isArray(val) && Object.entries(val).map(([k, v]: [string, any]) => (
                                    <div key={k}>
                                      <span className="text-[10px] text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                      {Array.isArray(v) ? (
                                        <ul className="space-y-0.5">
                                          {v.map((item: string, i: number) => <li key={i} className="text-xs">• {item}</li>)}
                                        </ul>
                                      ) : (
                                        <p className="text-xs">{v}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Delay System */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                        <Clock className="w-3.5 h-3.5 inline mr-1" />
                        Delay System
                      </h3>
                      <div className="bg-secondary p-3 rounded-md mb-3">
                        <p className="text-sm font-medium">2-5 day gaps between messages</p>
                        <p className="text-xs text-muted-foreground mt-1">Too fast → flagged as spam. Too slow → lose context.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary p-3 rounded-md">
                          <span className="text-xs text-muted-foreground">High-ticket deals</span>
                          <p className="text-sm mt-0.5">Longer gaps (4-5 days)</p>
                        </div>
                        <div className="bg-secondary p-3 rounded-md">
                          <span className="text-xs text-muted-foreground">Warm leads</span>
                          <p className="text-sm mt-0.5">Shorter gaps (2-3 days)</p>
                        </div>
                      </div>
                      {pb.followUpSystem && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-secondary p-3 rounded-md text-center">
                            <span className="text-2xl font-bold accent-text">{pb.followUpSystem?.totalTouches || "5-8"}</span>
                            <p className="text-xs text-muted-foreground mt-1">Total Touches</p>
                          </div>
                          <div className="bg-secondary p-3 rounded-md col-span-1 sm:col-span-3">
                            <span className="text-xs text-muted-foreground">Delay (days)</span>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {pb.followUpSystem?.delayDays?.map((d: number, i: number) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded tag-selected border border-primary">Day {d}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message Distribution */}
                    {pb.messageDistribution && (
                      <div className="glass-card p-5">
                        <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">🧱 Message Distribution</h3>
                        <div className="flex flex-wrap gap-2">
                          {pb.messageDistribution.map((m: any, i: number) => (
                            <div key={i} className="bg-secondary px-3 py-2 rounded-md flex items-center gap-2">
                              <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold accent-bg">{m.touch}</span>
                              <span className="text-sm">{m.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* What to Avoid */}
                    {pb.whatToAvoid && (
                      <div className="glass-card p-5">
                        <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">🚫 What to Avoid</h3>
                        <ul className="space-y-1.5">
                          {pb.whatToAvoid.map((w: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-destructive shrink-0">✗</span>{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>

          {/* Sequences You Can Try */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">🔁 Sequences You Can Try</h3>
            <p className="text-xs text-muted-foreground mb-4">Intent only. No scripts. Test which combo works best for your ICP.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SEQUENCES.map((seq, idx) => (
                <div key={idx} className="bg-secondary p-4 rounded-md">
                  <h4 className="text-sm font-semibold mb-3">{seq.name}</h4>
                  <div className="space-y-2">
                    {seq.steps.map((step, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold accent-bg shrink-0">{step.touch}</span>
                        <div>
                          <span className="text-xs font-medium">{step.type}</span>
                          <p className="text-[10px] text-muted-foreground">{step.intent}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tools to Use */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
              <Wrench className="w-3.5 h-3.5 inline mr-1" />
              Tools to Use
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TOOLS.map((tool, idx) => (
                <div key={idx} className="bg-secondary p-4 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold accent-text">{tool.name}</h4>
                    <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">{tool.desc}</p>
                  {tool.example && (
                    <p className="text-xs text-foreground mt-2 italic bg-card p-2 rounded">"{tool.example}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message Rules */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />
              Message Rules
            </h3>
            <ul className="space-y-1.5">
              {MESSAGE_RULES.map((rule, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary shrink-0">→</span>{rule}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {playbooks.length > 0 && !loading && (
        <div className="mt-8 flex items-center justify-between">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : <div />}
          <Button onClick={() => { onSave({ angle, result }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step → Finish & Download PDF
          </Button>
        </div>
      )}
    </motion.div>
  );
}
