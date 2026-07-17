import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "./LoadingSpinner";
import { InfoTooltip } from "./InfoTooltip";
import { callGemini, describeGeminiError, type GeminiImage } from "@/lib/workshop-store";
import { sanitizeAIText } from "@/lib/sanitize";
import { NO_JARGON_RULE, PERSONALISATION_RULE, GEO_AWARENESS_RULE, BUSINESS_TYPE_RULE } from "@/lib/prompt-rules";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/use-autosave";
import { copyToClipboard as copyTextToClipboard } from "@/lib/clipboard";
import { Copy, Check, ExternalLink, Upload, ArrowLeft } from "lucide-react";
import { MYNTMORE_NOTION_LINK } from "@/lib/constants";
import { joinField } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Step5Props {
  data: any;
  icpData: any;
  valuePropData: any;
  profileData: any;
  onboardingData?: any;
  userName?: string;
  onSave: (data: any, opts?: { silent?: boolean }) => void;
  onNext: () => void;
  onBack?: () => void;
}

const FOLLOW_UP_PROMPTS = [
  {
    label: "📱 Make it Mobile-Friendly",
    description: "Ensures the entire site works perfectly on phones and tablets",
    prompt: "Review the entire website layout and make it fully responsive for mobile devices. Ensure: navigation collapses to a hamburger menu, hero text is legible at 375px width, all buttons are at least 44px tall, images scale without overflow, and the FAQ accordion works on touch screens. Stack all multi-column sections vertically on mobile. Increase tap targets to at least 44x44px.",
  },
  {
    label: "🛡️ Add Trust Signals",
    description: "Adds credibility elements like logos, badges, and social proof",
    prompt: "Add 3 trust signal sections to the website: 1) A client logo bar showing 4-6 recognisable brand logos in a horizontal row below the hero. 2) A 'Featured In' press bar with media outlet logos. 3) A statistics bar showing 3-4 key metrics (e.g. '200+ clients served', '4.9/5 rating', '3x average ROI'). Use subtle animations on scroll. Ensure all elements are responsive.",
  },
  {
    label: "💬 Add Testimonials Section",
    description: "Creates a section with detailed customer testimonials",
    prompt: "Create a detailed testimonials section with 6 testimonials. Each testimonial must include: client full name, role, company name, a headshot placeholder, a 2-3 sentence quote describing the specific result they achieved, and a metric or number (e.g. '3x more leads in 60 days'). Display as a responsive card grid (3 columns on desktop, 1 on mobile). Add a subtle hover effect on each card.",
  },
  {
    label: "💰 Add Pricing Section",
    description: "Creates a pricing table with feature comparison",
    prompt: "Design a pricing section with 3 tiers: Starter, Growth, and Enterprise. Each tier must include: price, billing period, a list of 6-8 features with checkmarks, a CTA button, and a 'Most Popular' badge on the Growth tier. Add a feature comparison table below the pricing cards. Include a FAQ section underneath with 4 pricing-related questions. Make the Growth tier visually prominent.",
  },
  {
    label: "🔍 Add SEO Meta Tags",
    description: "Adds all essential SEO elements for search engine visibility",
    prompt: "Add complete SEO optimisation to the website: 1) A compelling meta title under 60 characters with the primary keyword. 2) A meta description under 160 characters. 3) Open Graph tags for social sharing (og:title, og:description, og:image, og:url). 4) Twitter Card tags. 5) Structured data (JSON-LD) for Organization and WebPage schemas. 6) Alt text for every image. 7) Canonical URL tag. 8) A semantic HTML structure with proper heading hierarchy (single H1, H2s for sections).",
  },
  {
    label: "🧭 Improve Navigation Header",
    description: "Makes the header sticky, responsive, and conversion-focused",
    prompt: "Redesign the navigation header to be fully sticky and responsive. On desktop: show brand logo/name on the left, 5-6 navigation links in the centre (About, Services, Results, Testimonials, FAQ, Contact), and a prominent CTA button on the right ('Book a Call'). On mobile: collapse to a hamburger menu with smooth slide-in animation. Add a subtle shadow on scroll. Ensure the CTA button is always visible.",
  },
  {
    label: "⚡ Improve Page Speed",
    description: "Optimises loading performance for better user experience",
    prompt: "Optimise the entire website for page speed: 1) Lazy-load all images below the fold using loading='lazy'. 2) Use next-gen image formats (WebP) where possible. 3) Minimise CSS by removing unused styles. 4) Add font-display: swap to all font imports. 5) Defer non-critical JavaScript. 6) Compress all assets. 7) Add preconnect hints for external resources. 8) Ensure the Largest Contentful Paint (LCP) element loads within 2.5 seconds.",
  },
  {
    label: "📊 ROI Calculator",
    description: "Adds an interactive ROI calculator to show prospects the value of your service",
    prompt: "Add an interactive ROI Calculator section to the website. It should let users input their current metrics (e.g. monthly leads, conversion rate, average deal size) and calculate projected results after using the service. Display results dynamically with clear before/after numbers, percentage improvement, and projected revenue gain. Style it as a prominent section with a dark card background, clear input fields, and a bold results display. Make it fully responsive.",
  },
  {
    label: "💵 Cost Savings Calculator",
    description: "Shows prospects how much they save compared to hiring or alternatives",
    prompt: "Add a Cost Savings Calculator section. Let users input: cost of hiring in-house (salary + benefits), cost of current agency or freelancer, number of hours spent on this task per week. Calculate and display: annual savings with your service, time saved per month, cost per result comparison. Show a clear visual comparison table or chart. Include a CTA below the results: 'See how much you could save. Book a call.'",
  },
  {
    label: "📈 Growth Projection Tool",
    description: "Visualises expected growth trajectory based on user inputs",
    prompt: "Add a Growth Projection Tool section. Let users input: current monthly revenue or leads, desired growth rate, timeline (3, 6, or 12 months). Generate and display a simple line chart showing projected growth month-by-month. Include milestone markers at key points. Add context text explaining assumptions. Include a CTA: 'Want to hit these numbers? Let us show you how.' Style with brand colors and make fully responsive.",
  },
  {
    label: "✅ Lead Qualification Quiz",
    description: "Adds an interactive quiz that qualifies visitors and captures leads",
    prompt: "Add a Lead Qualification Quiz section with 5-7 multiple choice questions. Questions should assess: company size, current challenges, budget range, timeline, and goals. At the end, show a personalised result (e.g. 'You are a great fit for our Growth plan'). Include a lead capture form (name, email) before revealing results. Display a progress bar during the quiz. Style as a full-width section with one question per screen and smooth transitions.",
  },
];

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150;
}

function parseDataUrl(dataUrl: string): GeminiImage | undefined {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return undefined;
  return { mimeType: match[1], data: match[2] };
}

const ALL_COLOR_PRESETS = [
  { name: "Ocean Trust", primary: "#2563EB", secondary: "#F8FAFC" },
  { name: "Fresh Growth", primary: "#059669", secondary: "#F0FDF4" },
  { name: "Elegant Plum", primary: "#7C3AED", secondary: "#FAF5FF" },
  { name: "Indigo Slate", primary: "#4F46E5", secondary: "#F8FAFC" },
  { name: "Sunset Glow", primary: "#F97316", secondary: "#FFF7ED" },
  { name: "Sky Calm", primary: "#0284C7", secondary: "#F0F9FF" },
  { name: "Teal Breeze", primary: "#0D9488", secondary: "#F0FDFA" },
  { name: "Rose Petal", primary: "#E11D48", secondary: "#FFF1F2" },
  { name: "Crimson Peak", primary: "#DC2626", secondary: "#FEF2F2" },
  { name: "Deep Violet", primary: "#6D28D9", secondary: "#F5F3FF" },
  { name: "Forest Green", primary: "#15803D", secondary: "#F0FDF4" },
  { name: "Fuchsia Flare", primary: "#C026D3", secondary: "#FDF4FF" },
  { name: "Cobalt Ice", primary: "#1D4ED8", secondary: "#EFF6FF" },
  { name: "Terracotta", primary: "#C2410C", secondary: "#FFF7ED" },
  { name: "Dark Teal", primary: "#115E59", secondary: "#F0FDFA" },
  { name: "Burgundy", primary: "#881337", secondary: "#FFF1F2" },
  { name: "Plum Mist", primary: "#581C87", secondary: "#F9F5FF" },
  { name: "Emerald Pine", primary: "#047857", secondary: "#ECFDF5" },
  { name: "Orchid Dream", primary: "#9333EA", secondary: "#FAF5FF" },
  { name: "Clay Warmth", primary: "#B45309", secondary: "#FFFBEB" },
  { name: "Steel Slate", primary: "#475569", secondary: "#F8FAFC" },
  { name: "Midnight Sky", primary: "#1E3A8A", secondary: "#EFF6FF" },
  { name: "Jade Whisper", primary: "#0F766E", secondary: "#F0FDFA" },
  { name: "Grape Vines", primary: "#701A75", secondary: "#FDF4FF" },
  { name: "Ocean Breeze", primary: "#0E7490", secondary: "#ECFEFF" },
  { name: "Slate Mist", primary: "#334155", secondary: "#F8FAFC" },
  { name: "Warm Copper", primary: "#9A3412", secondary: "#FFF7ED" },
  { name: "Fern Green", primary: "#166534", secondary: "#F0FDF4" },
  { name: "Deep Navy", primary: "#172554", secondary: "#EFF6FF" },
  { name: "Sweet Rosé", primary: "#9D174D", secondary: "#FFF1F2" },
  { name: "Eggplant", primary: "#4A044E", secondary: "#FDF4FF" },
  { name: "Mint Leaf", primary: "#065F46", secondary: "#ECFDF5" }
];

const STYLE_ARCHETYPES = [
  "Swiss minimalist: generous white space, strict grid alignment, restrained typography, no decorative elements, lots of breathing room",
  "Editorial premium: large serif or high-contrast display headings, magazine-style asymmetric layouts, refined spacing, sophisticated feel",
  "Bold geometric: sharp angular shapes, confident oversized typography, strong diagonal or angled section dividers",
  "Soft organic: rounded corners, gentle gradients, soft blob shapes, warm and approachable feel, friendly typography",
  "Modern product-led: clean cards with subtle shadows, gradient accents, product-screenshot-first hero, tech-forward but calm",
  "Warm human-centred: photography-led sections, handwritten-style accent details, friendly rounded typography, personable tone",
];

const GENERAL_FAQS = [
  { q: "What does this tool generate?", a: "A complete, ready-to-paste prompt that builds a high-converting landing page using your customer data, value proposition, and brand colors." },
  { q: "Who should use this?", a: "Founders, marketers, and consultants who need a professional website without hiring a developer or agency." },
  { q: "Do I need technical skills?", a: "No. You paste the prompt into AI Studio or Lovable, and it generates the code for you. No coding required." },
  { q: "How accurate are the generated strategies?", a: "They are based on your specific inputs (target customers, pain points, value proposition), so they are highly tailored, not generic templates." },
  { q: "Can I customise the output?", a: "Yes. Use the follow-up prompts below to refine specific sections like mobile layout, testimonials, pricing, or SEO." },
  { q: "How long does it take to see results?", a: "You can have a deployed landing page within 30 minutes of generating the prompt." },
  { q: "Can I use this for multiple customer types?", a: "Yes. Each generation uses your selected customer data. Run it again with different inputs for tailored pages." },
  { q: "Is this suitable for early-stage startups?", a: "Absolutely. It is designed to help you launch fast with professional positioning, even pre-revenue." },
  { q: "How is this different from ChatGPT tools?", a: "This uses your workshop data (target customers, value proposition, offer) as context, so the output is specific to your business, not generic." },
  { q: "Can I use this for outbound and inbound?", a: "Yes. The landing page works as an inbound asset. Pair it with the Outreach Playbook step for outbound." },
  { q: "What should I do after getting results?", a: "Deploy the site, then iterate: refine copy, add testimonials, connect analytics, and start driving traffic." },
  { q: "Can this replace an agency?", a: "For an MVP landing page, yes. For complex multi-page sites with custom integrations, consider an agency later." },
];

const AI_STUDIO_FAQS = [
  { q: "How do I use the generated prompt?", a: "1. Copy the prompt\n2. Open aistudio.google.com/apps\n3. Paste it in\n4. Click Generate" },
  { q: "What if the output is not good?", a: "Use the follow-up prompts to refine specific sections. Do not regenerate the entire thing, tweak one part at a time." },
  { q: "What model should I use in AI Studio?", a: "Gemini 2.0 Flash for speed, Gemini Pro for higher quality. Both work well for website generation." },
  { q: "Can I upload a design reference?", a: "Yes. Upload a screenshot of a site you like. AI Studio will use its layout structure while applying your brand colors." },
  { q: "What is a GitHub repository?", a: "A folder in the cloud that stores your code. Think of it as a save file for your website that you can update anytime." },
  { q: "How do I push code to GitHub?", a: "1. Create a new repo on github.com\n2. Copy the generated code into it\n3. Commit and push, or use GitHub's upload feature" },
  { q: "How do I deploy using Vercel?", a: "1. Push code to GitHub\n2. Go to vercel.com and connect your repo\n3. Click Deploy\n4. Your site is live" },
  { q: "How do I connect GitHub to Vercel?", a: "Sign into Vercel with your GitHub account. It will show your repos. Select the one with your site code." },
  { q: "How do I redeploy after changes?", a: "Push updated code to GitHub. Vercel auto-detects changes and redeploys within seconds." },
  { q: "How do I fix deployment errors?", a: "Check the Vercel build log for the error message. Common fixes: missing dependencies, typos in imports, or wrong file paths." },
  { q: "Can I use Netlify instead of Vercel?", a: "Yes. The process is nearly identical: connect GitHub, select repo, deploy. Both platforms work great." },
  { q: "Do I need a custom domain?", a: "Not to start. Vercel and Netlify give you a free subdomain. Add a custom domain later when ready." },
];

const LOVABLE_FAQS = [
  { q: "What is Lovable?", a: "An AI-powered app builder. Paste your prompt and it generates a full React site with styling and interactions." },
  { q: "Can I paste the prompt into Lovable?", a: "Yes. Lovable interprets the prompt and generates a complete, editable React site with Tailwind CSS." },
  { q: "How do I use prompts effectively?", a: "Be specific. Instead of 'make it better', say 'change the hero headline to X and make the CTA button larger'." },
  { q: "How do I avoid wasting credits?", a: "Do NOT regenerate the entire page. Use targeted prompts to modify specific sections only." },
  { q: "Should I regenerate entire outputs?", a: "No. Modify specific sections instead. Full regeneration wastes credits and may lose good parts of the design." },
  { q: "How do I update only one section?", a: "Reference the section by name: 'Update the FAQ section to include 2 more questions about pricing'." },
  { q: "What is the best way to iterate UI?", a: "Generate once, then iterate: fix layout first, then copy, then design polish. One change per prompt." },
  { q: "How do I fix broken outputs?", a: "Describe what is broken specifically: 'The testimonial cards overlap on mobile' rather than 'fix the layout'." },
  { q: "How do I structure prompts?", a: "Use this format: What to change + Where it is + How it should look. Keep it under 3 sentences." },
  { q: "How do I test multiple variations?", a: "Ask for 'version A and version B of the hero section' in one prompt. Compare and pick the best." },
  { q: "When should I regenerate vs edit?", a: "Edit when 80%+ is good. Regenerate only if the entire output missed the mark. Editing saves credits." },
  { q: "What are common mistakes to avoid?", a: "Vague prompts, regenerating everything, not specifying sections, and changing too many things at once." },
];

export function Step5Website({ data, icpData, valuePropData, profileData, onboardingData, userName, onSave, onNext, onBack }: Step5Props) {
  const presets = useMemo(() => {
    const shuffled = [...ALL_COLOR_PRESETS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  }, []);

  const [form, setForm] = useState(() => ({
    brandName: data?.brandName || "",
    primaryColor: data?.primaryColor || presets[0]?.primary || "",
    secondaryColor: data?.secondaryColor || presets[0]?.secondary || "",
  }));
  const [designRef, setDesignRef] = useState<string | null>(data?.designRef || null);
  const [generatedPrompt, setGeneratedPrompt] = useState(data?.generatedPrompt || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const secondaryColorRef = useRef<HTMLInputElement>(null);

  useAutosave({ ...form, generatedPrompt, designRef }, onSave);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDesignRef(reader.result as string);
      toast({ title: "✓ Design reference uploaded", duration: 2000 });
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!form.brandName.trim()) { setError("Brand name is required"); return; }
    if (!form.primaryColor || !form.secondaryColor) { setError("Choose a primary and secondary colour"); return; }
    setError("");
    setLoading(true);

    const icps = icpData?.result || [];
    const vps = valuePropData?.result || [];
    const offer = profileData?.coreOffer || icpData?.offer || "";
    const businessType = joinField(onboardingData?.businessType);
    const sellingTo = joinField(onboardingData?.sellingTo);
    const icpSummary = icps.map((icp: any, i: number) =>
      `ICP ${i + 1}: ${icp.name}. Pain Points: ${(icp.painPoints || []).slice(0, 3).join(", ")}. Geography: ${icp.geographyContext || "Not specified"}`
    ).join("\n");
    const topVP = vps[0] ? `${vps[0].corePromise || vps[0].desiredOutcome}` : offer;

    const designImage = designRef ? parseDataUrl(designRef) : undefined;
    const designInstruction = designImage
      ? "\n\nDESIGN REFERENCE (MANDATORY): An image is attached to this request. Study its actual layout, section order, spacing, typography scale, and visual structure, and closely follow that structure for this website. Do NOT copy its colours. Use ONLY the brand colours specified above."
      : "";

    const industry = joinField(onboardingData?.industry);
    const industryHint = industry
      ? `Industry Context (MANDATORY): This is a ${industry} business. The visual language, imagery references, and copy tone must feel authentic to this specific industry, not like a generic template.`
      : "";

    const useLightTheme = isLightColor(form.secondaryColor);
    const themeInstruction = useLightTheme
      ? "Use a LIGHT theme: white or very light neutral backgrounds, with the given colours used as accents, headings, and CTAs. Body text stays dark and readable."
      : "Use a DARK theme: deep neutral backgrounds (not pure black), with the given colours used as accents, headings, and CTAs. Body text stays light and readable.";
    const styleArchetype = STYLE_ARCHETYPES[Math.floor(Math.random() * STYLE_ARCHETYPES.length)];

    const companyName = profileData?.company || form.brandName;
    const isCompany = Boolean(companyName) && (!userName || companyName.toLowerCase() !== userName.toLowerCase());
    const toneInstruction = isCompany
      ? `TONE: This is a COMPANY website for "${companyName}". Use "We" instead of "I". Include Services, Offerings, and Team positioning. Write in a professional company tone, not a personal brand tone.`
      : `TONE: This is a personal brand website. Use "I" where appropriate. Focus on the individual's expertise and authority.`;

    const prompt = `You are a world-class conversion rate optimisation expert and web designer.

${NO_JARGON_RULE}

${PERSONALISATION_RULE}

${GEO_AWARENESS_RULE}

${BUSINESS_TYPE_RULE}

Selling To: ${sellingTo || "Not specified"}
Business Type: ${businessType || "Not specified"}

COLOUR OVERRIDE (MANDATORY): The ONLY colours to use in this website are: Primary: ${form.primaryColor}, Secondary: ${form.secondaryColor}. Do not use yellow (#FFC947) or black (#000000) unless those are the user's selected colours. Apply primary colour to: CTA buttons, headings, highlighted text, links, and accent elements. Apply secondary colour to: background, cards, section fills, and supporting areas. CSS variables must be: --primary: ${form.primaryColor}; --secondary: ${form.secondaryColor}; Strictly use the provided colour palette. Do not introduce new colours. Ensure contrast is maintained and visual hierarchy is clear across all sections.

${toneInstruction}

${industryHint}

Design Direction (MANDATORY, do not default to a generic template): ${styleArchetype}

IMPORTANT: The website MUST include a sticky navigation header at the top of every page. The header must contain: the brand logo or name on the left, navigation links in the centre (e.g. About, Services, Results, FAQ, Contact), and a CTA button on the right (e.g. 'Book a Call'). The header must be visible at all times as the user scrolls.

EFFICIENCY (MANDATORY): Write this prompt so an AI page builder (like Lovable) can generate the complete, working site correctly in ONE generation, without needing many follow-up edits to fix errors or missing pieces. Be precise and complete, but keep the scope realistic: avoid requesting complex backend logic, data persistence, or more than one interactive tool. This prompt should be buildable within about 5 Lovable credits total (1 initial generation plus a couple of small follow-up refinements), so prioritise clarity and feasibility over exhaustive extra scope. Keep the prompt itself reasonably concise, every line should earn its place.

Generate a ready-to-paste prompt for building a high-converting landing page.

Inputs:
- Brand Name: ${form.brandName}
- Company: ${companyName}
- Primary Colour: ${form.primaryColor}
- Secondary Colour: ${form.secondaryColor}
- Core Offer: ${offer}
- Value Proposition: ${topVP}
- Target Customers and Pain Points:
${icpSummary}
${designInstruction}

The generated website must have EXACTLY these 8 sections in this order:
1. Hero Section
2. Problem Section
3. Solution Section
4. Value Proposition Section
5. Free Resource Section (MANDATORY): ONE simple, focused interactive tool-based resource (e.g. a single calculator or quiz, NOT an ebook/PDF, and not more than one tool)
6. CTA Section
7. FAQ Section: 6-8 questions covering: trust, process, timeline, effort, vs alternatives, pricing, and results guarantee
8. Footer: TJ's LinkedIn, Instagram, Newsletter, Calendly, Myntmore Website: https://myntmore.com

Design rules:
- ${themeInstruction}
- Follow the Design Direction above, not a generic template
- Font: Inter or Outfit
- All copy must be FINAL

Output a detailed, ready-to-paste prompt. Do NOT return JSON. Return plain text.`;

    try {
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000));
      const raw = await Promise.race([callGemini(prompt, undefined, designImage), timeoutP]) as string;
      const sanitized = sanitizeAIText(raw);
      setGeneratedPrompt(sanitized);
      onSave({ ...form, generatedPrompt: sanitized, designRef });
      toast({ title: "✓ Saved", duration: 3000 });
    } catch (e: any) {
      setError(describeGeminiError(e));
    } finally {
      setLoading(false);
    }
  };

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index?: number) => {
    if (!text) {
      console.error("Nothing to copy");
      return;
    }
    await copyTextToClipboard(text);
    toast({ title: "✓ Copied to clipboard", duration: 2000 });
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl mx-auto">
      <h2 className="text-[20px] font-bold mb-1">Build Your <span className="accent-text">Website</span></h2>
      <p className="text-muted-foreground mb-8 text-sm">Generate a ready-to-use website prompt</p>

      <div className="glass-card p-6 space-y-4 mb-6">
        <div>
          <Label className="text-sm text-muted-foreground">Brand / Business Name *</Label>
          <Input value={form.brandName} onChange={e => update("brandName", e.target.value)} className="mt-1 bg-secondary border-border focus:border-primary" />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground">Brand Colours *</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">Pick a combination that works, or customise below. Required to generate your prompt.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map(preset => {
              const isActive = form.primaryColor === preset.primary && form.secondaryColor === preset.secondary;
              return (
                <button key={preset.name} type="button"
                  onClick={() => setForm(p => ({ ...p, primaryColor: preset.primary, secondaryColor: preset.secondary }))}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-md border transition-colors ${isActive ? "border-primary bg-primary/5" : "border-border bg-secondary hover:border-muted-foreground"}`}>
                  <div className="flex w-full h-8 rounded overflow-hidden border border-border/50">
                    <div className="flex-1" style={{ backgroundColor: preset.primary }} />
                    <div className="flex-1" style={{ backgroundColor: preset.secondary }} />
                  </div>
                  <span className="text-xs text-foreground font-medium">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Primary Colour</Label>
            <div className="flex items-center gap-2 mt-1">
              {form.primaryColor ? (
                <>
                  <button type="button" onClick={() => primaryColorRef.current?.click()} aria-label="Change primary colour"
                    className="w-10 h-10 rounded cursor-pointer border border-border" style={{ backgroundColor: form.primaryColor }} />
                  <span className="text-sm text-muted-foreground font-mono">{form.primaryColor}</span>
                </>
              ) : (
                <button type="button" onClick={() => primaryColorRef.current?.click()}
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-dashed border-border bg-secondary text-muted-foreground hover:border-muted-foreground transition-colors">
                  <span className="w-4 h-4 rounded-full border border-muted-foreground" />
                  Choose colour
                </button>
              )}
              <input ref={primaryColorRef} type="color" value={form.primaryColor || "#000000"} onChange={e => update("primaryColor", e.target.value)} className="sr-only" />
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Secondary Colour</Label>
            <div className="flex items-center gap-2 mt-1">
              {form.secondaryColor ? (
                <>
                  <button type="button" onClick={() => secondaryColorRef.current?.click()} aria-label="Change secondary colour"
                    className="w-10 h-10 rounded cursor-pointer border border-border" style={{ backgroundColor: form.secondaryColor }} />
                  <span className="text-sm text-muted-foreground font-mono">{form.secondaryColor}</span>
                </>
              ) : (
                <button type="button" onClick={() => secondaryColorRef.current?.click()}
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-dashed border-border bg-secondary text-muted-foreground hover:border-muted-foreground transition-colors">
                  <span className="w-4 h-4 rounded-full border border-muted-foreground" />
                  Choose colour
                </button>
              )}
              <input ref={secondaryColorRef} type="color" value={form.secondaryColor || "#000000"} onChange={e => update("secondaryColor", e.target.value)} className="sr-only" />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Design Reference (optional)</Label>
          <p className="text-xs text-muted-foreground mb-2">Upload a screenshot of a site you like. We'll use its structure, not its colors.</p>
          <div className="mt-1">
            {designRef ? (
              <div className="relative">
                <img src={designRef} alt="Design reference" className="w-full max-h-48 object-cover rounded-md border border-border" />
                <button onClick={() => setDesignRef(null)} className="absolute top-2 right-2 bg-card/80 text-foreground p-1 rounded text-xs hover:bg-card">✕</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full h-20 rounded-md border border-dashed border-border bg-secondary cursor-pointer hover:border-muted-foreground transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Drop image or click to upload</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <a href="https://www.pinterest.com/search/pins/?q=website+design+inspiration" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-md bg-secondary border border-border hover:border-muted-foreground transition-colors">
          <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" fill="#E60023">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
          </svg>
          <div>
            <span className="text-sm font-medium text-foreground">Get design inspiration on Pinterest</span>
            <p className="text-xs text-muted-foreground">Browse website layouts and styles</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
        </a>
      </div>

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {!loading && !generatedPrompt && (
        <Button onClick={generate} disabled={!form.brandName.trim() || !form.primaryColor || !form.secondaryColor} className="accent-bg hover:opacity-90 w-full h-11 font-semibold disabled:opacity-50">
          Generate Website Prompt
        </Button>
      )}

      {!loading && generatedPrompt && (
        <Button onClick={generate} variant="ghost" className="w-full text-muted-foreground">Regenerate Website Prompt</Button>
      )}

      {loading && <LoadingSpinner text="Generating your website prompt..." />}

      {generatedPrompt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Generated Prompt</h3>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedPrompt, -1)} className="text-muted-foreground hover:text-primary">
                {copiedIndex === -1 ? <Check className="w-4 h-4 mr-1 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
                {copiedIndex === -1 ? "Copied!" : "Copy"}
              </Button>
            </div>
            <pre className="text-xs text-muted-foreground bg-secondary p-4 rounded-md overflow-auto max-h-80 whitespace-pre-wrap">{generatedPrompt}</pre>
          </div>

          <a href="https://lovable.dev/invite/W067E3R" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-md accent-bg hover:opacity-90 transition-colors font-semibold text-sm">
            Build it with Lovable (no coding needed) <ExternalLink className="w-4 h-4" />
          </a>

          <a href="https://aistudio.google.com/apps" target="_blank" rel="noopener noreferrer"
            className="glass-card p-4 flex items-center gap-3 hover:border-primary transition-colors">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Or open Google AI Studio (Gemini) →</p>
              <p className="text-xs text-muted-foreground mt-0.5">Paste the prompt into AI Studio to generate the site with Gemini instead.</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>

          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Paste the prompt into AI Studio or Lovable. For best results, upload a screenshot of a website you love.</p>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Refine Your Output</h3>
            <div className="space-y-2">
              {FOLLOW_UP_PROMPTS.map((p, i) => (
                <div key={i} className="bg-secondary p-3 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{p.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(p.prompt, i)} className="shrink-0 text-muted-foreground hover:text-primary">
                      {copiedIndex === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Frequently Asked Questions</h3>
            <Tabs defaultValue="general">
              <TabsList className="bg-secondary w-full">
                <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
                <TabsTrigger value="aistudio" className="flex-1 text-xs">AI Studio & Deploy</TabsTrigger>
                <TabsTrigger value="lovable" className="flex-1 text-xs">Lovable</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <Accordion type="single" collapsible>
                  {GENERAL_FAQS.map((faq, i) => (
                    <AccordionItem key={i} value={`g-${i}`} className="border-border">
                      <AccordionTrigger className="text-sm text-foreground hover:no-underline py-3">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
              <TabsContent value="aistudio">
                <Accordion type="single" collapsible>
                  {AI_STUDIO_FAQS.map((faq, i) => (
                    <AccordionItem key={i} value={`a-${i}`} className="border-border">
                      <AccordionTrigger className="text-sm text-foreground hover:no-underline py-3">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
              <TabsContent value="lovable">
                <Accordion type="single" collapsible>
                  {LOVABLE_FAQS.map((faq, i) => (
                    <AccordionItem key={i} value={`l-${i}`} className="border-border">
                      <AccordionTrigger className="text-sm text-foreground hover:no-underline py-3">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            </Tabs>
          </div>

          <Button onClick={generate} variant="ghost" className="w-full text-muted-foreground">Regenerate Website Prompt</Button>
        </motion.div>
      )}

      {generatedPrompt && (
        <div className="mt-8 flex items-center justify-between">
          {onBack ? (
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : <div />}
          <Button onClick={() => { onSave({ ...form, generatedPrompt, designRef }); onNext(); }} className="accent-bg hover:opacity-90 h-12 px-8 font-semibold">
            Next Step →
          </Button>
        </div>
      )}
    </motion.div>
  );
}
