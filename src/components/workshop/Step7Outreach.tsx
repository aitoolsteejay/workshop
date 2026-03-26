import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

const ANGLES = ["Authority", "ROI", "Pain-led", "Contrarian", "Curiosity", "Offer-led"];
const CHANNELS = ["LinkedIn Only", "Cold Email Only", "Both"];

interface Step7Props {
  data: any;
  icpData: any;
  valuePropData: any;
  profileData: any;
  onboardingData: any;
  onSave: (data: any) => void;
  onNext: () => void;
}

export function Step7Outreach({ data, icpData, valuePropData, profileData, onboardingData, onSave, onNext }: Step7Props) {
  const [angle, setAngle] = useState(data?.angle || "Authority");
  const [channel, setChannel] = useState(data?.channel || "Both");
  const [result, setResult] = useState<any>(data?.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const generationIdRef = useRef(0);

  const offer = icpData?.offer || "";
  const icps = icpData?.result || [];
  const vps = valuePropData?.result || [];
  const userName = profileData?.role ? `${profileData.role} at ${profileData.company}` : "";
  const industry = onboardingData?.industry || "";

  const generate = useCallback(async () => {
    // Increment generation ID to invalidate previous calls
    const currentGenId = ++generationIdRef.current;

    setError("");
    setLoading(true);
    setResult(null); // Reset state before new generation

    const icpSummary = icps.slice(0, 2).map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).slice(0, 3).join(", ")}`
    ).join("\n");

    const topVP = vps[0] ? `${vps[0].desiredOutcome} — ${vps[0].yourMethod}` : offer;

    const prompt = `You are a world-class B2B Outreach Strategist. Generate a complete outreach package.

- Client: ${userName}
- Offer: ${offer}
- Value Prop: ${topVP}
- Target Industry: ${industry}
- ICP Summary:
${icpSummary}
- Selected Angle: ${angle}
- Selected Channel: ${channel}

OUTPUT:
A. LinkedIn Sequence (5 touches):
- Connection Request: Under 300 characters. Human, no pitch.
- Follow-up 1 (Day 3): Value-add, no ask
- Follow-up 2 (Day 7): Soft relevance nudge
- Follow-up 3 (Day 14): Gentle CTA
- Follow-up 4 (Day 21): Breakup or re-engage

B. Cold Email Sequence (3 emails):
- Email 1: Subject line + body (problem-aware, 4 to 6 lines)
- Email 2: Subject line + body (case study or proof, 3 to 5 lines)
- Email 3: Subject line + body (direct ask, 3 to 4 lines)

Rules:
- No em dashes. Use periods or commas instead.
- No corporate jargon.
- All messages must lean into the selected angle: ${angle}
- Tone: confident but human

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "strategySummary": string,
  "linkedIn": {
    "connectionRequest": string,
    "followUps": [4 strings for Day 3, Day 7, Day 14, Day 21]
  },
  "email": {
    "emails": [
      { "subject": string, "body": string },
      { "subject": string, "body": string },
      { "subject": string, "body": string }
    ]
  }
}`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;

      // Check if this generation is still current
      if (currentGenId !== generationIdRef.current) return;

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
      onSave({ angle, channel, result: parsed });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      if (currentGenId !== generationIdRef.current) return;
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : (e.message || "Failed"));
    } finally {
      if (currentGenId === generationIdRef.current) setLoading(false);
    }
  }, [angle, channel, offer, icps, vps, userName, industry, onSave, toast]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", duration: 2000 });
  };

  const linkedInLabels = ["Connection Request", "Follow-up 1 (Day 3)", "Follow-up 2 (Day 7)", "Follow-up 3 (Day 14)", "Follow-up 4 (Day 21)"];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Your Personalised Outreach Sequences</h2>
      <p className="text-muted-foreground mb-6">Tailored messages for your ICPs</p>

      <div className="glass-card p-6 space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium">Choose your outreach angle</label>
          <select value={angle} onChange={e => setAngle(e.target.value)} className="w-full mt-1 h-10 px-3 rounded-md bg-muted/50 border border-border/50 text-foreground text-sm">
            {ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Choose your channel</label>
          <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full mt-1 h-10 px-3 rounded-md bg-muted/50 border border-border/50 text-foreground text-sm">
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <Button onClick={generate} className="gradient-bg hover:opacity-90 w-full h-11 font-semibold">
          {result ? "Regenerate Sequences" : "Generate Outreach Sequences"}
        </Button>
      </div>

      {loading && <LoadingSpinner text="Crafting your outreach sequences..." />}
      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {result && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Strategy Summary */}
          {result.strategySummary && (
            <div className="glass-card p-6 border-l-4 border-primary">
              <p className="text-sm italic text-muted-foreground">"{result.strategySummary}"</p>
            </div>
          )}

          {/* LinkedIn */}
          {result.linkedIn && (channel === "LinkedIn Only" || channel === "Both") && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold gradient-text mb-4">💼 LinkedIn Sequence</h3>
              <div className="space-y-3">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-semibold">{linkedInLabels[0]}</h4>
                    <Button variant="ghost" size="sm" onClick={() => copyText(result.linkedIn.connectionRequest)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.linkedIn.connectionRequest}</p>
                </div>
                {result.linkedIn.followUps?.map((fu: string, i: number) => (
                  <div key={i} className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-semibold">{linkedInLabels[i + 1]}</h4>
                      <Button variant="ghost" size="sm" onClick={() => copyText(fu)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{fu}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email */}
          {result.email && (channel === "Cold Email Only" || channel === "Both") && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold gradient-text mb-4">📧 Cold Email Sequence</h3>
              <div className="space-y-3">
                {result.email.emails?.map((em: any, i: number) => (
                  <div key={i} className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-semibold">Email {i + 1}</h4>
                      <Button variant="ghost" size="sm" onClick={() => copyText(`Subject: ${em.subject}\n\n${em.body}`)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-primary mb-1">Subject: {em.subject}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{em.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {result && !loading && (
        <div className="mt-8 flex justify-end">
          <Button onClick={() => { onSave({ angle, channel, result }); onNext(); }} className="gradient-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step → Finish & Download PDF
          </Button>
        </div>
      )}
    </motion.div>
  );
}
