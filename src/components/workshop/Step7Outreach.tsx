import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini } from "@/lib/workshop-store";
import { sanitizeAIOutput } from "@/lib/sanitize";
import { NO_JARGON_RULE, PERSONALISATION_RULE } from "@/lib/prompt-rules";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle, Video, Clock, ExternalLink, Wrench, ShieldAlert, X, Lightbulb } from "lucide-react";

const ANGLES = ["Authority", "ROI", "Pain-led", "Contrarian", "Curiosity", "Offer-led"];
const MAX_ANGLES = 2;

const POSITIONING_STYLES = [
  { name: "Peer", desc: "Talk to them as an equal. You understand their world because you have been there." },
  { name: "Expert", desc: "Lead with knowledge and track record. Let your results open the conversation." },
  { name: "Challenger", desc: "Point out a gap or assumption in how they currently operate. Provoke thinking." },
  { name: "Insider", desc: "Show industry-specific knowledge that makes them feel you truly get their world." },
];

const PRACTICE_STEPS = [
  {
    phase: "PHASE 1: BUILD AWARENESS",
    steps: [
      {
        step: 1,
        action: "Send Connection Request",
        detail: "You can add a personalised note or try without one. If adding a note: keep it friendly, lead with a genuine compliment about their work or a specific post. Never pitch in the connection request. If they do not see value in connecting, they will not accept, and you have lost that prospect.",
        tip: "Use their first name. Reference something specific about them, a post, a company milestone, or a recent achievement. Tools like Clay (clay.com) can pull recent activity like funding rounds, hiring sprees, or company news to help you personalise at scale.",
        timing: "Day 1",
      },
      {
        step: 2,
        action: "Once Accepted: Like and Comment on Their Post",
        detail: "After they accept, do NOT send a message yet. Instead, go to their profile, find a recent post, and like it, then leave a thoughtful, specific comment (not just 'Great post!').",
        tip: "They get a notification, check who commented, see your profile, and recall your connection request. You are now in their awareness without being in their inbox.",
        timing: "Day 2-3",
      },
    ],
  },
  {
    phase: "PHASE 2: GET INTO THEIR DMs",
    steps: [
      {
        step: 3,
        action: "Message 1: Curiosity or Insight Based",
        detail: "Wait 2-5 days after step 2 before sending. Highlight a problem they might be facing. Ask a genuine question about their business. Reference something specific about them (recent post, company, role). Keep it under 4 lines. No pitch. No 'I do this, can we talk?'",
        tip: "Goal: Start a conversation, not close a deal.",
        timing: "Day 5-7",
        delay: "2-5 days before next step",
      },
      {
        step: 4,
        action: "Message 2: Value Add",
        detail: "Wait 2-5 days after Message 1 if no reply. Options to try (pick one, not all): Send a Loom video (1-3 mins) showing something relevant to them. Share a relevant lead magnet that solves a real problem for them. Share a short case study relevant to their situation.",
        tip: "They have seen you, but have not engaged. This is how you get their attention without being pushy.",
        timing: "Day 10-14",
        delay: "2-5 days before next step",
      },
      {
        step: 5,
        action: "Message 3: Soft CTA or Graceful Close",
        detail: "Wait 2-5 days after Message 2. Now, and only now, subtly mention what you do. Format: 'I noticed [specific thing about their business]. We help [what you do]. I would love to understand more about what you are working on and see if there is a fit. Would a quick 20-minute call make sense?'",
        tip: "If No Reply: Let them go gracefully. Send one final message: 'Completely understand if now is not the right time. Here is [lead magnet]. Hope it is useful.' This keeps the door open and ensures you are remembered positively.",
        timing: "Day 17-20",
        delay: "Final touchpoint",
      },
    ],
  },
];

const SEQUENCES = [
  {
    name: "Clean and Simple",
    steps: [
      { action: "Connection Request", timing: "" },
      { action: "Like / Comment on post", timing: "" },
      { action: "Message 1: Curiosity", timing: "after 2-5 days" },
      { action: "Follow-up 1: Insight or question", timing: "after 1-2 days" },
      { action: "Follow-up 2: Value add", timing: "after 2-4 days" },
      { action: "Follow-up 3: Soft CTA", timing: "after 3-4 days" },
    ],
  },
  {
    name: "Value First",
    steps: [
      { action: "Connection Request", timing: "" },
      { action: "Like / Comment on post", timing: "" },
      { action: "Message 1: Insight", timing: "after 2-5 days" },
      { action: "Follow-up 1: Loom video", timing: "after 1-2 days" },
      { action: "Follow-up 2: Lead magnet", timing: "after 2-4 days" },
      { action: "Follow-up 3: Soft CTA", timing: "after 3-4 days" },
    ],
  },
  {
    name: "Full Personalised",
    steps: [
      { action: "Like / Comment BEFORE connecting", timing: "" },
      { action: "Connection Request with personalised note", timing: "" },
      { action: "Message 1: Observation or compliment", timing: "after 2-5 days" },
      { action: "Follow-up 1: Loom or voice note", timing: "after 1-2 days" },
      { action: "Follow-up 2: Lead magnet", timing: "after 2-4 days" },
      { action: "Follow-up 3: Graceful close with resource", timing: "after 3-4 days" },
    ],
  },
];


const MESSAGE_RULES = [
  "Every message must be under 5 lines",
  "No corporate jargon",
  "No 'I hope this finds you well'",
  "No long service explanations",
  "Always use their name and company name",
  "End with a question or a clear next step",
  "Do not use all touchpoints with every prospect, test one sequence at a time",
  "If someone says no, let them go",
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

${NO_JARGON_RULE}

- Client: ${userName}
- Offer: ${offer}
- Value Proposition: ${topVP}
- Industry: ${Array.isArray(industry) ? industry.join(", ") : industry}
- Selected Angles: ${angles.join(", ")}
- ICPs:
${icpSummary}

For EACH of the 3 target customer types, generate a strategic playbook with these sections:

1. "icpContext": { "who": string, "mindset": string, "careAbout": [3 strings], "ignore": [3 strings] }

2. "strategicApproach": { "bestAngle": string, "positioningStyle": one of "Peer"|"Expert"|"Challenger"|"Insider", "whatNotToDo": [3 strings] }

3. "personalisationTips": [3 strings, each a specific tip on how to make messages feel personally written for each person rather than generic]

4. "followUpSystem": { "totalTouches": number (4-6), "delayDays": [array of numbers], "escalationLogic": string, "toneEvolution": string }

5. "whatToAvoid": [4-5 specific mistakes for this customer type]

IMPORTANT: Do NOT use em-dashes, asterisks, or hash signs in any output.

Return ONLY valid JSON (no markdown):
{
  "playbooks": [
    { "icpName": string, "icpContext": ..., "strategicApproach": ..., "personalisationTips": [...], "followUpSystem": ..., "whatToAvoid": [...] },
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
      <h2 className="text-[20px] font-bold mb-1">Strategic <span className="accent-text">Outreach</span> Playbook</h2>
      <p className="text-muted-foreground mb-8 text-sm">Tactical outreach strategy per target customer type</p>

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
                const recommendedStyle = pb.strategicApproach?.positioningStyle;
                return (
                  <>
                    {/* ICP Context */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-3">ICP Context: {pb.icpName}</h3>
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
                      <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-1">
                        Strategic Approach
                        <InfoTooltip text="The overall mindset and positioning style to use with this type of customer" />
                      </h3>
                      <div className="bg-secondary p-3 rounded-md mb-3">
                        <span className="text-xs text-muted-foreground">Best Angle</span>
                        <p className="text-sm font-semibold accent-text mt-0.5">{pb.strategicApproach?.bestAngle}</p>
                      </div>
                    </div>

                    {/* Positioning Style - 2x2 Card Grid */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-1">
                        Positioning Style
                        <InfoTooltip text="How to present yourself, whether as a peer, expert, challenger, or industry insider, based on who you are talking to" />
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {POSITIONING_STYLES.map(ps => {
                          const isRecommended = recommendedStyle?.toLowerCase() === ps.name.toLowerCase();
                          return (
                            <div key={ps.name} className={`bg-secondary p-4 rounded-md border ${isRecommended ? "border-primary" : "border-border"}`}>
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-semibold">{ps.name}</h4>
                                {isRecommended && (
                                  <span className="text-[10px] font-bold accent-bg px-2 py-0.5 rounded">Recommended for you</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{ps.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* What This Looks Like in Practice */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-1">
                        What This Looks Like in Practice
                        <InfoTooltip text="A step-by-step real-world outreach flow to follow with this customer type" />
                      </h3>

                      <div className="bg-primary/10 border border-primary/20 rounded-md p-3 mb-4 flex gap-2">
                        <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">Likes, comments, and Loom videos warm up the prospect and increase the chances of your message being noticed and replied to. The whole point of LinkedIn outreach is to be remembered, not just to sell.</p>
                      </div>

                      <div className="space-y-4">
                        {PRACTICE_STEPS.map((phase) => (
                          <div key={phase.phase}>
                            <h4 className="text-xs font-semibold text-primary mb-2">{phase.phase}</h4>
                            <div className="space-y-2">
                              {phase.steps.map((ps) => (
                                <div key={ps.step} className="bg-secondary p-4 rounded-md">
                                  <div className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold accent-bg shrink-0 mt-0.5">{ps.step}</span>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">{ps.action}</span>
                                        <span className="text-[10px] text-muted-foreground">{ps.timing}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">{ps.detail}</p>
                                      {ps.tip && (
                                        <p className="text-xs text-primary mt-1.5">{ps.tip}</p>
                                      )}
                                      {ps.delay && (
                                        <span className="text-[10px] text-primary mt-1 inline-block">⏱ {ps.delay}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-4 flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">Do not send too many follow-ups. If someone explicitly says no, respect it. Retarget them with a helpful resource so you stay top of mind, but never push.</p>
                      </div>
                    </div>

                    {/* Personalisation Tips */}
                    {pb.personalisationTips && (
                      <div className="glass-card p-5">
                        <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-1">
                          Personalisation Tips
                          <InfoTooltip text="How to make your messages feel specifically written for each person rather than generic" />
                        </h3>
                        <ul className="space-y-1.5">
                          {pb.personalisationTips.map((tip: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-primary shrink-0">→</span>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Loom Video Guide */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Video className="w-3.5 h-3.5" /> Loom Video Guide
                      </h3>
                      <div className="bg-secondary p-4 rounded-md space-y-2">
                        <p className="text-sm font-semibold">What is Loom?</p>
                        <p className="text-xs text-muted-foreground">A 1-3 minute personalised screen recording (loom.com, free). Show something relevant to them: their website, a quick audit, a useful insight. Talk directly to them. Casual and direct. Not overproduced.</p>
                        <p className="text-xs text-muted-foreground mt-2"><strong>When to use:</strong> After engagement, when insight is strong.</p>
                        <p className="text-xs text-muted-foreground"><strong>Alternatively:</strong> Record and send a voice note on LinkedIn mobile.</p>
                      </div>
                    </div>

                    {/* Delay System */}
                    <div className="glass-card p-5">
                      <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-3">
                        <Clock className="w-3.5 h-3.5 inline mr-1" /> Delay System
                      </h3>
                      <div className="bg-secondary p-3 rounded-md mb-3">
                        <p className="text-sm font-semibold">2-5 day gaps between messages</p>
                        <p className="text-xs text-muted-foreground mt-1">Too fast = flagged as spam. Too slow = lose context.</p>
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

                    {/* What NOT to Do */}
                    {pb.whatToAvoid && (
                      <div className="glass-card p-5">
                        <h3 className="text-xs font-medium text-destructive uppercase tracking-wider mb-3 flex items-center gap-1">
                          What Not to Do
                          <InfoTooltip text="Common mistakes that reduce reply rates for this specific customer type" />
                        </h3>
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

          {/* Sequences to Try */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
              Sequences to Try
              <InfoTooltip text="Different combinations of touchpoints you can test. Start with one and adapt based on what gets replies." />
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Start with one sequence and adapt based on what gets replies.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SEQUENCES.map((seq, idx) => (
                <div key={idx} className="bg-secondary p-4 rounded-md">
                  <h4 className="text-sm font-semibold mb-3">{seq.name}</h4>
                  <div className="space-y-2">
                    {seq.steps.map((step, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold accent-bg shrink-0 mt-0.5">{j + 1}</span>
                        <div>
                          <span className="text-xs font-medium">{step.action}</span>
                          {step.timing && <p className="text-[10px] text-primary">{step.timing}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Message Rules */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-3">
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
