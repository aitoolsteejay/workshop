import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TONES = ["Bold", "Professional", "Casual", "Witty", "Direct", "Empathetic", "Data-driven", "Other"];

const TIERS = [
  { range: "0–40", name: "Needs Rebuild", desc: "Bottom 60% of LinkedIn profiles" },
  { range: "41–60", name: "Developing", desc: "Top 40%" },
  { range: "61–75", name: "Solid", desc: "Top 25%" },
  { range: "76–90", name: "Strong", desc: "Top 10%" },
  { range: "91–100", name: "Elite", desc: "Top 1%" },
];

function getTier(score: number) {
  if (score <= 40) return 0;
  if (score <= 60) return 1;
  if (score <= 75) return 2;
  if (score <= 90) return 3;
  return 4;
}

interface Step2Props {
  data: any;
  onSave: (data: any) => void;
  onNext: () => void;
}

export function Step2Profile({ data, onSave, onNext }: Step2Props) {
  const [form, setForm] = useState({
    role: data?.role || "",
    company: data?.company || "",
    headline: data?.headline || "",
    about: data?.about || "",
    targetAudience: data?.targetAudience || "",
    coreOffer: data?.coreOffer || "",
    tone: data?.tone || "",
    toneOther: data?.toneOther || "",
  });
  const [result, setResult] = useState<any>(data?.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showClarityTip, setShowClarityTip] = useState(false);
  const [showKeywordTip, setShowKeywordTip] = useState(false);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!form.role || !form.company || !form.headline || !form.targetAudience || !form.coreOffer || !form.tone) {
      setError("Please fill in all required fields");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    const tone = form.tone === "Other" ? form.toneOther : form.tone;
    const prompt = `You are an expert LinkedIn Profile Strategist specialising in B2B Lead Generation.

Analyse and optimise this LinkedIn profile:
- Current Headline: ${form.headline}
- About Section: ${form.about || "Not provided"}
- Role: ${form.role}
- Company: ${form.company}
- Target Audience (ICP): ${form.targetAudience}
- Core Offer: ${form.coreOffer}
- Preferred Tone: ${tone}

SCORING (0 to 100 total):
Score the profile on 5 criteria, 20 points each:
1. Clarity (0-20): How clearly does the headline communicate who they help, how, and why?
2. Specificity (0-20): Are the results and mechanisms concrete or vague?
3. Differentiation (0-20): Is the positioning unique vs competitors?
4. Proof (0-20): Are there credible markers, results, or experience mentioned?
5. Execution (0-20): Is the structure, tone, and flow professional?

Final Score = sum of all 5. Do NOT cap the score artificially. Strong profiles can reach 90+.

Keyword Score (separate 0-100 score):
- Exact match B2B power keywords found: up to 40 points
- Related industry terms: up to 30 points
- Action verbs showing results: up to 20 points
- Credibility markers: up to 10 points

Return ONLY a valid JSON object (no markdown, no code blocks) with:
{
  "clarityScore": number,
  "keywordScore": number,
  "finalScore": number,
  "scoreMeaning": string,
  "percentileRank": string,
  "scoreBreakdown": {
    "clarity": { "score": number, "explanation": string },
    "specificity": { "score": number, "explanation": string },
    "differentiation": { "score": number, "explanation": string },
    "proof": { "score": number, "explanation": string },
    "execution": { "score": number, "explanation": string }
  },
  "whatsWorking": [array of strings],
  "toImprove": [array of strings],
  "headlines": [3 strings],
  "aboutSection": string,
  "positioningAngles": string
}`;

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutPromise]) as string;
      
      // Try to parse JSON from the response
      let parsed;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        // Fallback: show raw text
        parsed = { raw: raw, finalScore: 0, scoreMeaning: "Could not parse — see raw output below" };
      }
      
      setResult(parsed);
      onSave({ ...form, result: parsed });
      toast({ title: "✓ Saved", description: "Profile analysis saved", duration: 3000 });
    } catch (e: any) {
      if (e.message === "timeout") {
        setError("This is taking too long. Please try again.");
      } else {
        setError(e.message || "Generation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    onSave({ ...form, result });
    onNext();
  };

  const tierIdx = result?.finalScore != null ? getTier(result.finalScore) : -1;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Optimise Your LinkedIn Profile</h2>
      <p className="text-muted-foreground mb-6">Get a detailed analysis and optimised suggestions</p>

      <div className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Role / Job Title *</Label>
            <Input value={form.role} onChange={e => update("role", e.target.value)} placeholder="Founder" className="mt-1 bg-muted/50 border-border/50" />
          </div>
          <div>
            <Label>Company Name *</Label>
            <Input value={form.company} onChange={e => update("company", e.target.value)} placeholder="Acme Inc" className="mt-1 bg-muted/50 border-border/50" />
          </div>
        </div>
        <div>
          <Label>Current LinkedIn Headline *</Label>
          <Input value={form.headline} onChange={e => update("headline", e.target.value)} placeholder="Reduce hiring time → for Talent Leaders → using automation" className="mt-1 bg-muted/50 border-border/50" />
        </div>
        <div>
          <Label>About Section (optional)</Label>
          <Textarea value={form.about} onChange={e => update("about", e.target.value)} placeholder="Your LinkedIn about section..." className="mt-1 bg-muted/50 border-border/50 min-h-[80px]" />
        </div>
        <div>
          <Label>Target Audience — Who do you sell to? *</Label>
          <Input value={form.targetAudience} onChange={e => update("targetAudience", e.target.value)} placeholder="e.g. SaaS founders in India" className="mt-1 bg-muted/50 border-border/50" />
        </div>
        <div>
          <Label>Core Offer *</Label>
          <Input value={form.coreOffer} onChange={e => update("coreOffer", e.target.value)} placeholder="e.g. LinkedIn outreach + cold email for B2B lead gen" className="mt-1 bg-muted/50 border-border/50" />
        </div>
        <div>
          <Label>Preferred Tone *</Label>
          <select value={form.tone} onChange={e => update("tone", e.target.value)} className="w-full mt-1 h-10 px-3 rounded-md bg-muted/50 border border-border/50 text-foreground text-sm">
            <option value="">Select...</option>
            {TONES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {form.tone === "Other" && (
            <Input value={form.toneOther} onChange={e => update("toneOther", e.target.value)} placeholder="Please specify" className="mt-2 bg-muted/50 border-border/50" />
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        {!loading && !result && (
          <Button onClick={generate} className="gradient-bg hover:opacity-90 w-full h-11 font-semibold">
            Generate Profile Analysis
          </Button>
        )}
      </div>

      {loading && <LoadingSpinner text="Analysing your LinkedIn profile... this takes ~20 seconds" />}

      {result && !result.raw && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-6">
          {/* Score */}
          <div className="glass-card p-6 text-center">
            <div className="text-5xl font-extrabold gradient-text inline-block">{result.finalScore}/100</div>
            <p className="text-lg font-semibold mt-1">{result.scoreMeaning}</p>
            <p className="text-muted-foreground text-sm">{result.percentileRank}</p>
          </div>

          {/* Tiers */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3">Profile Tiers</h3>
            <div className="space-y-2">
              {TIERS.map((t, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${i === tierIdx ? "gradient-bg" : "bg-muted/30"}`}>
                  <span className={`text-sm font-medium ${i === tierIdx ? "text-primary-foreground" : ""}`}>{t.range}: {t.name}</span>
                  <span className={`text-xs ${i === tierIdx ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{t.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              Score Breakdown
              <button onClick={() => setShowClarityTip(!showClarityTip)} className="text-muted-foreground hover:text-primary">
                <Info className="w-4 h-4" />
              </button>
            </h3>
            {showClarityTip && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mb-3">
                Clarity Score measures how clearly your headline communicates WHO you help, HOW you help them, and WHAT result they get. A score above 75 means most of your target audience immediately understands your offer.
              </p>
            )}
            {result.scoreBreakdown && Object.entries(result.scoreBreakdown).map(([key, val]: any) => (
              <div key={key} className="mb-3">
                <div className="flex justify-between text-sm">
                  <span className="capitalize font-medium">{key}</span>
                  <span className="text-primary">{val.score}/20</span>
                </div>
                <div className="h-2 bg-muted/50 rounded-full mt-1 overflow-hidden">
                  <div className="h-full gradient-bg rounded-full transition-all" style={{ width: `${(val.score / 20) * 100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{val.explanation}</p>
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Keyword Score: {result.keywordScore}/100</span>
                <button onClick={() => setShowKeywordTip(!showKeywordTip)} className="text-muted-foreground hover:text-primary">
                  <Info className="w-4 h-4" />
                </button>
              </div>
              {showKeywordTip && (
                <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mt-2">
                  Keyword Score measures B2B keyword strength. Exact match power keywords = 40pts, Related industry terms = 30pts, Action verbs = 20pts, Credibility markers = 10pts.
                </p>
              )}
            </div>
          </div>

          {/* What's Working / To Improve */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-green-400">✅ What's Working</h3>
              <ul className="space-y-2">
                {result.whatsWorking?.map((w: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">• {w}</li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 text-yellow-400">⚡ To Improve</h3>
              <ul className="space-y-2">
                {result.toImprove?.map((w: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">• {w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Headlines */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3">🎯 Generated Headlines</h3>
            {result.headlines?.map((h: string, i: number) => (
              <div key={i} className="bg-muted/30 p-3 rounded-lg mb-2 text-sm">{i + 1}. {h}</div>
            ))}
          </div>

          {/* About Section */}
          {result.aboutSection && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">📝 Optimised About Section</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.aboutSection}</p>
            </div>
          )}

          {/* Positioning */}
          {result.positioningAngles && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">💡 Positioning Angles</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.positioningAngles}</p>
            </div>
          )}

          <Button onClick={generate} variant="ghost" className="w-full">Regenerate Analysis</Button>
        </motion.div>
      )}

      {result?.raw && (
        <div className="glass-card p-6 mt-6">
          <h3 className="font-semibold mb-3">Raw Output</h3>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{result.raw}</pre>
          <Button onClick={generate} variant="ghost" className="mt-4 w-full">Try Again</Button>
        </div>
      )}

      {result && (
        <div className="mt-8 flex justify-end">
          <Button onClick={handleNext} className="gradient-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
