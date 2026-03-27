import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle, Video, Clock, ExternalLink, Wrench, ShieldAlert, X, Lightbulb } from "lucide-react";

const ANGLES = ["Authority", "ROI", "Pain-led", "Contrarian", "Curiosity", "Offer-led"];
const MAX_ANGLES = 2;

const PRACTICE_STEPS = [
  { step: 1, action: "Connection Sent", purpose: "Start the relationship with a short personalised note", timing: "Day 1" },
  { step: 2, action: "Connection Accepted", purpose: "They accept your request", timing: "Day 1-3" },
  { step: 3, action: "Liked their recent post", purpose: "Warm up, get on their radar", timing: "Day 2-3" },
  { step: 4, action: "Commented on their post", purpose: "Increase visibility, show genuine interest", timing: "Day 3-4", delay: "2-5 days before next step" },
  { step: 5, action: "Message 1 (curiosity or insight-based, 3-4 lines max)", purpose: "Open conversation using selected angle", timing: "Day 5-7", delay: "2-5 days before next step" },
  { step: 6, action: "Liked another post", purpose: "Maintain visibility without being pushy", timing: "Day 7-9" },
  { step: 7, action: "Message 2 (value-add, Loom video or lead magnet)", purpose: "Deliver personalised value, break pattern", timing: "Day 10-14", delay: "2-5 days before next step" },
  { step: 8, action: "Commented again (if no reply to Message 2)", purpose: "Stay visible one more time", timing: "Day 14-16" },
  { step: 9, action: "Message 3 (soft CTA or graceful close)", purpose: "Final touchpoint, offer value or exit gracefully", timing: "Day 17-20" },
];

const TOOLS = [
  { name: "CLAY", url: "https://clay.com", desc: "Pulls live data about prospects: recent posts, job changes, company news. Use to personalise your first message.", example: "\"Saw you just expanded your team, here's something useful for your outreach right now.\"" },
  { name: "CALENDLY", url: "https://calendly.com/founder-myntmore/30min", desc: "Always include your booking link in any CTA message. Send a direct booking link. Never ask them to reply with their availability, it creates friction.", example: null },
  { name: "APOLLO", url: "https://apollo.io", desc: "Use to find work emails when LinkedIn gets no response. Free tier available. Search by name + company name.", example: null },
];

const MESSAGE_RULES = [
  "Every message must be under 5 lines",
  "No corporate jargon",
  "No \"I hope this finds you well\"",
  "No long service explanations",
  "Always use their name and company name",
  "End with a question or a clear next step",
  "Do not use all touchpoints with every prospect, test one sequence at a time",
  "If someone says no, let them go",
];

const SEQUENCES = [
  { name: "Curiosity-led", steps: [
    { touch: 1, type: "Connection", intent: "Pattern-interrupt curiosity" },
    { touch: 2, type: "Follow-up", intent: "Curiosity hook" },
    { touch: 3, type: "Follow-up", intent: "Insight or observation" },
    { touch: 4, type: "Follow-up", intent: "Soft CTA" },
  ]},
  { name: "Insight-led", steps: [
    { touch: 1, type: "Connection", intent: "Relevant observation" },
    { touch: 2, type: "Follow-up", intent: "Industry insight" },
    { touch: 3, type: "Follow-up", intent: "Case study proof" },
    { touch: 4, type: "Follow-up", intent: "Direct CTA" },
  ]},
  { name: "Multi-format", steps: [
    { touch: 1, type: "Connection", intent: "Personalized observation" },
    { touch: 2, type: "Follow-up", intent: "Value-add content" },
    { touch: 3, type: "Loom / Voice", intent: "Personalized walkthrough" },
    { touch: 4, type: "Follow-up", intent: "Lead magnet offer" },
  ]},
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
  const [angles, setAngles] = useState<string[]>(data?.angles || (data?.angle ? [data.angle] : ["Authority", "ROI"]));
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

  const toggleAngle = (a: string) => {
    setAngles(prev => {
      if (prev.includes(a)) return prev.filter(x => x !== a);
      if (prev.length >= MAX_ANGLES) return prev;
      return [...prev, a];
    });
  };

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
- Selected Angles: ${angles.join(", ")}
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

4. "followUpSystem": { "totalTouches": number (4-6), "delayDays": [array of numbers], "escalationLogic": string, "toneEvolution": string }

5. "whatToAvoid": [4-5 specific mistakes for this ICP]

IMPORTANT: Do NOT use em-dashes, asterisks, or hash signs in any output.

Return ONLY valid JSON (no markdown):
{
  "playbooks": [
    { "icpName": string, "icpContext": ..., "strategicApproach": ..., "touchpointStrategy": ..., "followUpSystem": ..., "whatToAvoid": [...] },
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
      onSave({ angles, result: parsed });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      if (currentGenId !== generationIdRef.current) return;
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : "Something went wrong. Please try again.");
    } finally {
      if (currentGenId === generationIdRef.current) setLoading(false);
    }
  }, [angles, offer, icps, vps, userName, industry, onSave, toast]);

  const playbooks = result?.playbooks || [];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Strategic <span className="accent-text">Outreach</span> Playbook</h2>
      <p className="text-muted-foreground mb-8 text-sm">Tactical, psychological outreach strategy per ICP</p>

      <div className="glass-card p-5 mb-6">
        <label className="text-sm text-muted-foreground">Outreach Angles (select up to 2)</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ANGLES.map(a => (
            <button key={a} onClick={() => toggleAngle(a)}
              className={`text-sm px-4 py-2 rounded-md border transition-all flex items-center gap-1.5 ${
                angles.includes(a) ? "tag-selected border-primary" : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground"
              }`}>
              {a}
              {angles.includes(a) && <X className="w-3 h-3" />}
            </button>
          ))}
        </div>
        {angles.length === 0 && <p className="text-xs text-destructive mt-1">Select at least one angle</p>}

        <Button onClick={generate} className="accent-bg hover:opacity-90 w-full h-11 font-semibold mt-4" disabled={angles.length === 0}>
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
              <button key={idx} onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === idx ? "accent-bg" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                ICP {idx + 1}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
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
                            {pb.icpContext?.careAbout?.map((c: string, i: number) => <li key={i} className="text-sm text-emerald-400">✓ {c}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">They ignore</span>
                          <ul className="mt-1 space-y-0.5">
                            {pb.icpContext?.ignore?.map((c: string, i: number) => <li key={i} className="text-sm text-destructive">✗ {c}</li>)}
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
                          {pb.strategicApproach?.whatNotToDo?.map((w: string, i: number) => <li key={i} className="text-sm text-destructive/80">✗ {w}</li>)}
                        </ul>
                      </div>
                    </div>

                    {/* What This Looks Like in Practice */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">📋 What This Looks Like in Practice</h3>

                      <div className="bg-primary/10 border border-primary/20 rounded-md p-3 mb-4 flex gap-2">
                        <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">Likes and comments warm up the prospect and significantly increase the chances of your message being noticed and replied to.</p>
                      </div>

                      <div className="space-y-2">
                        {PRACTICE_STEPS.map((ps) => (
                          <div key={ps.step} className="bg-secondary p-3 rounded-md">
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold accent-bg shrink-0 mt-0.5">{ps.step}</span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{ps.action}</span>
                                </div>
                                <div className="flex flex-wrap gap-3 mt-1">
                                  <span className="text-xs text-muted-foreground">Purpose: {ps.purpose}</span>
                                  <span className="text-xs text-muted-foreground">Timing: {ps.timing}</span>
                                </div>
                                {ps.delay && (
                                  <span className="text-[10px] text-primary mt-1 inline-block">⏱ {ps.delay}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-4 flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">Not every step must be used. Test one sequence at a time. Adapt based on what gets responses.</p>
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
                              compliment: "Compliment Strategy", voiceNote: "Voice Note", loom: "Loom Video",
                              caseStudy: "Case Study", leadMagnet: "Lead Magnet", curiosity: "Building Curiosity",
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

                    {/* Loom Video Guide */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Video className="w-3.5 h-3.5" /> Loom Video Guide
                      </h3>
                      <div className="bg-secondary p-4 rounded-md space-y-2">
                        <p className="text-sm font-medium">What is Loom?</p>
                        <p className="text-xs text-muted-foreground">A 1-3 minute personalised screen recording (loom.com, free). Show something relevant to them: their website, a quick audit, a useful insight. Talk directly to them. Casual and direct. Not overproduced.</p>
                        <p className="text-xs text-muted-foreground mt-2"><strong>When to use:</strong> After engagement, when insight is strong.</p>
                        <p className="text-xs text-muted-foreground"><strong>Alternatively:</strong> Record and send a voice note on LinkedIn mobile.</p>
                      </div>
                    </div>

                    {/* Delay System */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                        <Clock className="w-3.5 h-3.5 inline mr-1" /> Delay System
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
                            <span className="text-2xl font-bold accent-text">{pb.followUpSystem?.totalTouches || "4-6"}</span>
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

                    {/* What to Avoid */}
                    {pb.whatToAvoid && (
                      <div className="glass-card p-5">
                        <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">🚫 What to Avoid</h3>
                        <ul className="space-y-1.5">
                          {pb.whatToAvoid.map((w: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-destructive shrink-0">✗</span>{w}</li>
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
              <Wrench className="w-3.5 h-3.5 inline mr-1" /> Tools to Use
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
                  {tool.example && <p className="text-xs text-foreground mt-2 italic bg-card p-2 rounded">"{tool.example}"</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Message Rules */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              <ShieldAlert className="w-3.5 h-3.5 inline mr-1" /> Message Rules
            </h3>
            <ul className="space-y-1.5">
              {MESSAGE_RULES.map((rule, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-primary shrink-0">→</span>{rule}</li>
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
          <Button onClick={() => { onSave({ angles, result }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step → Finish & Download PDF
          </Button>
        </div>
      )}
    </motion.div>
  );
}
