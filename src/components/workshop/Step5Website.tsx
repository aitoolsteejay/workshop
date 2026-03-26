import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "./LoadingSpinner";
import { callGemini } from "@/lib/workshop-store";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink } from "lucide-react";

interface Step5Props {
  data: any;
  icpData: any;
  valuePropData: any;
  onSave: (data: any) => void;
  onNext: () => void;
}

const FOLLOW_UP_PROMPTS = [
  "Now optimise the mobile layout. Make all sections stack vertically, increase font sizes for readability, and ensure CTA buttons are full-width on mobile.",
  "Add 3 trust signals: client logos section, testimonial carousel with photo+name+result, and a 'Featured In' press bar.",
  "Create a detailed testimonials section with 6 testimonials. Each should include: client name, role, company, specific result achieved, and a star rating.",
  "Add an SEO section: meta title, meta description, Open Graph tags, structured data (JSON-LD), and alt text for all images.",
  "Design a pricing section with 3 tiers: Starter, Growth, and Enterprise. Include feature comparison table and FAQ below it.",
];

export function Step5Website({ data, icpData, valuePropData, onSave, onNext }: Step5Props) {
  const [form, setForm] = useState({
    brandName: data?.brandName || "",
    primaryColor: data?.primaryColor || "#4f8ef7",
    secondaryColor: data?.secondaryColor || "#7b2ff7",
    niche: data?.niche || icpData?.niche || "",
  });
  const [generatedPrompt, setGeneratedPrompt] = useState(data?.generatedPrompt || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!form.brandName.trim()) { setError("Brand name is required"); return; }
    setError("");
    setLoading(true);
    setGeneratedPrompt("");

    const icps = icpData?.result || [];
    const vps = valuePropData?.result || [];
    const offer = icpData?.offer || "";

    const icpSummary = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).slice(0, 3).join(", ")}`
    ).join("\n");

    const topVP = vps[0] ? `${vps[0].desiredOutcome} — ${vps[0].yourMethod}` : offer;

    const prompt = `You are a world-class conversion rate optimisation expert and B2B web designer.

Generate a comprehensive, ready-to-paste prompt for building a high-converting landing page.

Inputs:
- Brand Name: ${form.brandName}
- Primary Colour: ${form.primaryColor}
- Secondary Colour: ${form.secondaryColor}
- Niche: ${form.niche || "General B2B"}
- Core Offer: ${offer}
- Value Proposition: ${topVP}
- Target ICPs and Pain Points:
${icpSummary}

The generated website must have EXACTLY these 8 sections in this order:
1. Hero Section: Attention-grabbing headline, sub-headline, and primary CTA button
2. Problem Section: Agitate the core pain points of the ICP
3. Solution Section: How ${form.brandName} solves these problems
4. Value Proposition Section: Specific outcomes and what makes this different
5. Free Resource Section (MANDATORY): Include 3 specific, interactive tool-based resources (NOT ebooks or PDFs). Each must have: Name, Format (Calculator/Diagnostic/Generator/Analyzer), What it does, User Input, Output, Why it works, CTA
6. CTA Section: Final conversion push
7. FAQ Section: 8 questions covering Trust, Process, Time to results, Effort required, Who it is NOT for, Differentiation vs alternatives, Risk, and Pricing
8. Footer: Include links to TJ's LinkedIn, Instagram, Newsletter, Calendly, and Myntmore Notion page

Design rules:
- Use Dark theme with given colours
- Use glassmorphism, smooth gradients, and micro-animations
- Font: Inter or Outfit
- All copy must be FINAL and strategic — no placeholder text

Output a detailed, ready-to-paste prompt that the user can copy into Google AI Studio (aistudio.google.com/apps) to build the full site. Do NOT return JSON. Return the prompt as plain text.`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt), timeoutP]) as string;
      setGeneratedPrompt(raw);
      onSave({ ...form, generatedPrompt: raw });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      setError(e.message === "timeout" ? "This is taking too long. Please try again." : (e.message || "Failed"));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", duration: 2000 });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-1">Build Your High-Converting Website</h2>
      <p className="text-muted-foreground mb-6">Generate a ready-to-use website prompt</p>

      <div className="glass-card p-6 space-y-4 mb-6">
        <div>
          <Label>Brand / Business Name *</Label>
          <Input value={form.brandName} onChange={e => update("brandName", e.target.value)} className="mt-1 bg-muted/50 border-border/50" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Primary Colour</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.primaryColor} onChange={e => update("primaryColor", e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
              <span className="text-sm text-muted-foreground">{form.primaryColor}</span>
            </div>
          </div>
          <div>
            <Label>Secondary Colour</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.secondaryColor} onChange={e => update("secondaryColor", e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
              <span className="text-sm text-muted-foreground">{form.secondaryColor}</span>
            </div>
          </div>
        </div>
        <div>
          <Label>Niche</Label>
          <Input value={form.niche} onChange={e => update("niche", e.target.value)} placeholder="e.g. AI-powered HR tech" className="mt-1 bg-muted/50 border-border/50" />
        </div>
      </div>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {!loading && !generatedPrompt && (
        <Button onClick={generate} className="gradient-bg hover:opacity-90 w-full h-11 font-semibold">
          Generate Website Prompt
        </Button>
      )}

      {loading && <LoadingSpinner text="Generating your website prompt..." />}

      {generatedPrompt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Generated Prompt</h3>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedPrompt)}>
                <Copy className="w-4 h-4 mr-1" /> Copy Prompt
              </Button>
            </div>
            <pre className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg overflow-auto max-h-80 whitespace-pre-wrap">{generatedPrompt}</pre>
          </div>

          <a
            href="https://aistudio.google.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-lg border border-primary/50 text-primary hover:bg-primary/10 transition-colors font-medium text-sm"
          >
            Open Google AI Studio <ExternalLink className="w-4 h-4" />
          </a>

          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">💡 <strong>Tip:</strong> Paste the prompt above into AI Studio. For best results, also upload a screenshot of a website you love.</p>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold mb-3">Refine Your Output</h3>
            <div className="space-y-2">
              {FOLLOW_UP_PROMPTS.map((p, i) => (
                <div key={i} className="flex items-start gap-2 bg-muted/30 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground flex-1">{p}</p>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(p)} className="shrink-0">
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={generate} variant="ghost" className="w-full">Regenerate</Button>
        </motion.div>
      )}

      {generatedPrompt && (
        <div className="mt-8 flex justify-end">
          <Button onClick={() => { onSave({ ...form, generatedPrompt }); onNext(); }} className="gradient-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
