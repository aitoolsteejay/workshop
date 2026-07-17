import jsPDF from "jspdf";
import { sanitizeAIText } from "./sanitize";
import { MYNTMORE_NOTION_LINK } from "./constants";
import myntmoreLogo from "@/assets/myntmore-full-logo.png";

let cachedLogoImg: HTMLImageElement | null = null;
let cachedLogoRatio = 1;

async function loadLogo(): Promise<boolean> {
  if (cachedLogoImg) return true;
  try {
    const img = new Image();
    img.src = myntmoreLogo;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      setTimeout(reject, 3000);
    });
    cachedLogoImg = img;
    cachedLogoRatio = img.height / img.width;
    return true;
  } catch {
    return false;
  }
}

const LINKS = {
  linkedin: "https://www.linkedin.com/in/tejasjhaveri",
  instagram: "https://www.instagram.com/tejas_jhaveri",
  calendly: "https://calendly.com/founder-myntmore/web",
  notion: MYNTMORE_NOTION_LINK,
};

function clean(text: string): string {
  if (!text) return "";
  return sanitizeAIText(text);
}

function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const MARGIN = 40;
const PX_TO_PT = 0.75;
const PAGE_MARGIN = MARGIN * PX_TO_PT; // ~30pt

function addHeader(doc: jsPDF) {
  // Add logo top-left on every page
  if (cachedLogoImg) {
    const logoW = 16;
    const logoH = cachedLogoRatio * logoW;
    doc.addImage(cachedLogoImg, "PNG", PAGE_MARGIN, 8, logoW, logoH);
  }
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const w = doc.internal.pageSize.getWidth();
  doc.text("Myntmore x B2B Growth Workshop", w - PAGE_MARGIN, 12, { align: "right" });
}

function addFooter(doc: jsPDF) {
  const h = doc.internal.pageSize.getHeight();
  const y = h - 10;
  doc.setFontSize(7);

  const footerLinks = [
    { text: "TJ's LinkedIn", url: LINKS.linkedin, x: PAGE_MARGIN },
    { text: "Instagram", url: LINKS.instagram, x: PAGE_MARGIN + 40 },
    { text: "Book a Call", url: LINKS.calendly, x: PAGE_MARGIN + 72 },
    { text: "Myntmore Services", url: LINKS.notion, x: PAGE_MARGIN + 105 },
  ];

  for (const link of footerLinks) {
    doc.setTextColor(40, 80, 180);
    doc.text(link.text, link.x, y);
    const tw = doc.getTextWidth(link.text);
    doc.link(link.x, y - 3, tw, 5, { url: link.url });
  }
}

// Stamps "Page X of N" bottom-right on every page. Run once at the very end,
// since the total page count is only known after all content is laid out.
function addPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${totalPages}`, w - PAGE_MARGIN, h - 10, { align: "right" });
  }
}

function addHeaderFooter(doc: jsPDF) {
  addHeader(doc);
  addFooter(doc);
}

function newSection(doc: jsPDF, title: string) {
  doc.addPage();
  addHeaderFooter(doc);
  const w = doc.internal.pageSize.getWidth();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(clean(title), PAGE_MARGIN, 36);
  // Thin grey divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, 40, w - PAGE_MARGIN, 40);
  doc.setFont("helvetica", "normal");
  return 50;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5.5): number {
  if (!text) return y;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(capitalize(clean(text)), maxWidth);
  const pageH = doc.internal.pageSize.getHeight() - 20;
  for (const line of lines) {
    if (y > pageH) {
      doc.addPage();
      addHeaderFooter(doc);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      y = 30;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addBulletList(doc: jsPDF, items: string[], x: number, y: number, maxWidth: number): number {
  if (!items || !Array.isArray(items)) return y;
  const bulletX = x + 12; // 16px indent in pt ~12
  for (const item of items) {
    const pageH = doc.internal.pageSize.getHeight() - 20;
    if (y > pageH) { doc.addPage(); addHeaderFooter(doc); y = 30; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("•", x + 4, y);
    const lines = doc.splitTextToSize(capitalize(clean(item)), maxWidth - 12);
    for (const line of lines) {
      if (y > pageH) {
        doc.addPage();
        addHeaderFooter(doc);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        y = 30;
      }
      doc.text(line, bulletX, y);
      y += 5.5;
    }
    y += 1.5;
  }
  return y;
}

function addSubHeader(doc: jsPDF, text: string, y: number): number {
  const pageH = doc.internal.pageSize.getHeight() - 20;
  if (y > pageH) { doc.addPage(); addHeaderFooter(doc); y = 30; }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(clean(text), PAGE_MARGIN, y);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

// Rough height (in pt) that a wrapped block of text will need, used to decide
// whether to keep a short block together on the current page or start fresh.
function estimateTextHeight(doc: jsPDF, text: string, maxWidth: number, lineHeight: number = 5.5): number {
  if (!text) return 0;
  doc.setFontSize(11);
  return doc.splitTextToSize(capitalize(clean(text)), maxWidth).length * lineHeight;
}

// Forces a page break now if the given block wouldn't fit in the remaining space,
// so short trailing blocks don't get orphaned as a couple of lines on an otherwise blank page.
function ensureSpace(doc: jsPDF, y: number, neededHeight: number): number {
  const pageH = doc.internal.pageSize.getHeight() - 20;
  if (y + neededHeight > pageH) {
    doc.addPage();
    addHeaderFooter(doc);
    return 30;
  }
  return y;
}

export async function generatePDF(sessionData: any) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const maxW = w - PAGE_MARGIN * 2;
  const userName = sessionData?.user_name || "Attendee";
  const addonsPrompt = sessionData?.jewellery_design_data?.basePrompt;
  const modellingData = sessionData?.jewellery_modelling_data;
  const showAddons = !!(addonsPrompt || (modellingData?.modelPrompts && modellingData.modelPrompts.length > 0));

  // Load logo for all pages
  const logoLoaded = await loadLogo();

  // Cover page - centered large logo
  if (cachedLogoImg) {
    const logoW = 50;
    const logoH = cachedLogoRatio * logoW;
    doc.addImage(cachedLogoImg, "PNG", (w - logoW) / 2, 35, logoW, logoH);
  }

  // Cover page
  addHeaderFooter(doc);
  const titleY = logoLoaded ? 90 : 80;
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("B2B Growth Strategy", w / 2, titleY, { align: "center" });
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(`By ${userName}`, w / 2, titleY + 15, { align: "center" });
  doc.setFontSize(11);
  doc.text(new Date().toLocaleDateString(), w / 2, titleY + 25, { align: "center" });
  doc.setFontSize(12);
  doc.setTextColor(120, 120, 120);
  doc.text("Powered by Myntmore", w / 2, titleY + 40, { align: "center" });

  // ICPs (declared early so the Table of Contents can reflect the actual count)
  const icps = (sessionData?.icp_data?.result || []).filter(Boolean);

  // Table of Contents
  let y = newSection(doc, "Table of Contents");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const tocItems = ["Profile Analysis", ...icps.map((_: any, i: number) => `ICP ${i + 1}`), "Value Propositions", "Website Prompt", "Growth Strategy", "Outreach Playbook", ...(showAddons ? ["Bonus Add-Ons"] : [])];
  tocItems.forEach((item, i) => {
    doc.text(`${i + 1}. ${item}`, PAGE_MARGIN + 5, y);
    y += 8;
  });

  // Profile Analysis
  const profile = sessionData?.profile_data?.result;
  y = newSection(doc, "Profile Analysis");
  if (profile) {
    const score = Math.min(profile.finalScore || 0, 100);
    y = addSubHeader(doc, `Score: ${score}/100, ${clean(profile.scoreMeaning)}`, y);
    y += 3;
    if (profile.scoreBreakdown) {
      for (const [key, val] of Object.entries(profile.scoreBreakdown) as any) {
        y = addWrappedText(doc, `${capitalize(key)}: ${Math.min(val.score, 20)}/20, ${clean(val.explanation)}`, PAGE_MARGIN, y, maxW);
        y += 2;
      }
    }
    y += 5;
    y = addSubHeader(doc, "What's Working", y);
    y = addBulletList(doc, profile.whatsWorking, PAGE_MARGIN, y, maxW);
    y += 3;
    y = addSubHeader(doc, "To Improve", y);
    y = addBulletList(doc, profile.toImprove, PAGE_MARGIN, y, maxW);
    y += 3;
    y = addSubHeader(doc, "Generated Headlines", y);
    y = addBulletList(doc, profile.headlines, PAGE_MARGIN, y, maxW);
    y += 3;

    if (profile.aboutSection) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "Optimised About Section", y);
      const paras = profile.aboutSection.split(/\n\n+/).filter(Boolean);
      for (const para of paras) {
        y = addWrappedText(doc, para, PAGE_MARGIN, y, maxW);
        y += 2;
      }
      y += 3;
    }

    if (profile.positioningAngles) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "Positioning Angles", y);
      const angles = Array.isArray(profile.positioningAngles)
        ? profile.positioningAngles
        : String(profile.positioningAngles).split(/\n+|(?=\d+\.\s)/).map((s: string) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
      y = addBulletList(doc, angles, PAGE_MARGIN, y, maxW);
      y += 3;
    }
  }

  // ICPs
  for (let i = 0; i < icps.length; i++) {
    const icp = icps[i];
    const icpLabel = `ICP ${i + 1}: ${clean(icp.name || "Untitled")}${icp.audienceType ? ` (${icp.audienceType})` : ""}`;
    y = newSection(doc, icpLabel);
    const fields = [
      { key: "whoTheyAre", label: "Who They Are" },
      { key: "coreResponsibilities", label: "Core Responsibilities" },
      { key: "painPoints", label: "Pain Points" },
      { key: "goalsDesires", label: "Goals and Desires" },
      { key: "buyingTriggers", label: "Buying Triggers" },
      { key: "objections", label: "Objections" },
      { key: "psychology", label: "Psychology" },
      { key: "whereTheyHangOut", label: "Where They Hang Out" },
      { key: "howToPosition", label: "How to Position" },
      { key: "geographyContext", label: "Target Geography Context" },
    ];
    for (const f of fields) {
      const val = icp[f.key];
      if (!val) continue;
      y = addSubHeader(doc, f.label, y);
      if (Array.isArray(val)) {
        y = addBulletList(doc, val, PAGE_MARGIN, y, maxW);
      } else {
        y = addWrappedText(doc, val, PAGE_MARGIN, y, maxW);
      }
      y += 3;
    }
    if (Array.isArray(icp.channelPartners) && icp.channelPartners.length > 0) {
      // If there's only a sliver of room left, start the whole section on a fresh page
      // instead of letting just its header (or first entry) get stranded down here.
      y = ensureSpace(doc, y, 8 + estimateTextHeight(doc, `${icp.channelPartners[0]?.partnerType}: ${icp.channelPartners[0]?.whyTheyFit}`, maxW));
      y = addSubHeader(doc, "Channel Partners", y);
      for (const p of icp.channelPartners) {
        const partnerLine = `${clean(p.partnerType)}: ${clean(p.whyTheyFit)}`;
        const approachLine = p.approachAngle ? `Approach: ${clean(p.approachAngle)}` : "";
        const needed = estimateTextHeight(doc, partnerLine, maxW) + (approachLine ? estimateTextHeight(doc, approachLine, maxW) : 0) + 2;
        y = ensureSpace(doc, y, needed);
        y = addWrappedText(doc, partnerLine, PAGE_MARGIN, y, maxW);
        if (approachLine) y = addWrappedText(doc, approachLine, PAGE_MARGIN, y, maxW);
        y += 2;
      }
      y += 3;
    }
  }

  // Value Propositions
  const vps = (sessionData?.value_prop_data?.result || []).filter(Boolean);
  y = newSection(doc, "Value Propositions");
  for (let i = 0; i < vps.length; i++) {
    const vp = vps[i];
    const vpAudienceType = vp.icpName === "Channel Partners" ? null : icps[i]?.audienceType;
    const vpLabel = vp.icpName === "Channel Partners" ? "Channel Partners" : `ICP ${i + 1}: ${clean(vp.icpName)}${vpAudienceType ? ` (${vpAudienceType})` : ""}`;
    y = addSubHeader(doc, vpLabel, y);
    if (vp.corePromise) { y = addWrappedText(doc, `Core Promise: ${clean(vp.corePromise)}`, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.coreAngle) { y = addWrappedText(doc, `Core Angle: ${clean(vp.coreAngle)}`, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.beforeState) { y = addSubHeader(doc, "Before", y); y = addBulletList(doc, vp.beforeState, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.afterState) { y = addSubHeader(doc, "After", y); y = addBulletList(doc, vp.afterState, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.threeStepSystem) {
      y = addSubHeader(doc, "3-Step System", y);
      for (const step of vp.threeStepSystem) {
        y = addWrappedText(doc, `${clean(step.step)}: ${clean(step.description)}`, PAGE_MARGIN, y, maxW);
        y += 2;
      }
    }
    if (vp.whyOthersFail) { y = addSubHeader(doc, "Why Others Fail", y); y = addBulletList(doc, vp.whyOthersFail, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.whyYouWin) { y = addSubHeader(doc, "Why We Win", y); y = addBulletList(doc, vp.whyYouWin, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.whatsInItForThem) { y = addSubHeader(doc, "What's In It For Them", y); y = addBulletList(doc, vp.whatsInItForThem, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.idealPartnerProfile) { y = addWrappedText(doc, `Ideal Partner Profile: ${clean(vp.idealPartnerProfile)}`, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.partnershipSteps) {
      y = addSubHeader(doc, "How the Partnership Works", y);
      for (const step of vp.partnershipSteps) {
        y = addWrappedText(doc, `${clean(step.step)}: ${clean(step.description)}`, PAGE_MARGIN, y, maxW);
        y += 2;
      }
    }
    if (vp.whyPartnerWithUs) { y = addSubHeader(doc, "Why Partner With Us", y); y = addBulletList(doc, vp.whyPartnerWithUs, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.howToApproachThem) { y = addWrappedText(doc, `How to Approach Them: ${clean(vp.howToApproachThem)}`, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.contentStrategy || vp.oneLiner) { y = addWrappedText(doc, `Content Strategy: ${clean(vp.contentStrategy || vp.oneLiner)}`, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.shortPitch) { y = addWrappedText(doc, `Pitch: ${clean(vp.shortPitch)}`, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.cta) { y = addWrappedText(doc, `Call to Action: ${clean(vp.cta)}`, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.positioning) {
      y = addSubHeader(doc, "Positioning Statement", y);
      y = addWrappedText(doc, clean(vp.positioning), PAGE_MARGIN, y, maxW);
      y += 2;
    }
    y += 5;
  }

  // Website Prompt
  y = newSection(doc, "Website Prompt");
  y = addWrappedText(doc, clean(sessionData?.website_data?.generatedPrompt || "Not generated"), PAGE_MARGIN, y, maxW);

  // GTM
  const gtm = sessionData?.gtm_data?.result;
  y = newSection(doc, "Growth Strategy");
  if (gtm) {
    const strategies = (gtm.icpStrategies || (gtm.channels ? [gtm] : [])).filter(Boolean);
    for (let si = 0; si < strategies.length; si++) {
      const strat = strategies[si];
      if (strat.icpName) { y = addSubHeader(doc, `ICP ${si + 1}: ${clean(strat.icpName)}`, y); y += 2; }
      if (strat.channels) {
        y = addSubHeader(doc, "Primary Channels", y);
        for (const ch of strat.channels) {
          y = ensureSpace(doc, y, 10 + estimateTextHeight(doc, ch.useCase || "", maxW));
          y = addWrappedText(doc, `${clean(ch.name)} (Effort: ${ch.effort}, ROI: ${ch.roi})${ch.startHere ? " , START HERE" : ""}`, PAGE_MARGIN, y, maxW);
          y = addWrappedText(doc, clean(ch.useCase), PAGE_MARGIN, y, maxW);
          y += 1;
          if (ch.tips && ch.tips.length > 0) {
            y = addBulletList(doc, ch.tips, PAGE_MARGIN, y, maxW);
          }
          y += 3;
        }
      }
      if (strat.timeline) {
        y = addSubHeader(doc, "Execution Timeline", y);
        for (const phase of strat.timeline) {
          y = addWrappedText(doc, `${clean(phase.phase)}: ${clean(phase.title)}`, PAGE_MARGIN, y, maxW);
          y = addBulletList(doc, phase.tasks, PAGE_MARGIN, y, maxW);
          y += 3;
        }
      }
      if (strat.partners?.types) {
        y = addSubHeader(doc, "Partner Strategy", y);
        for (const p of strat.partners.types) {
          const mainLine = `${clean(p.type)}: ${clean(p.angle)}`;
          const detailsLine = p.offer ? `Offer: ${clean(p.offer)}` : "";
          const snippetLine = p.snippet ? `Snippet: "${clean(p.snippet)}"` : "";

          y = ensureSpace(doc, y, estimateTextHeight(doc, mainLine, maxW) + (detailsLine ? estimateTextHeight(doc, detailsLine, maxW) : 0) + (snippetLine ? estimateTextHeight(doc, snippetLine, maxW) : 0) + 4);
          y = addWrappedText(doc, mainLine, PAGE_MARGIN, y, maxW);
          if (detailsLine) y = addWrappedText(doc, detailsLine, PAGE_MARGIN, y, maxW);
          if (snippetLine) y = addWrappedText(doc, snippetLine, PAGE_MARGIN, y, maxW);
          y += 2;
        }
      }
      if (strat.leadMagnets) {
        y = addSubHeader(doc, "Lead Magnets", y);
        for (const lm of strat.leadMagnets) {
          const headerLine = `${clean(lm.name)} (${lm.type || lm.format})${lm.bestStart ? " [Best Starting Point]" : ""}`;
          const icpLine = `For: ${clean(lm.targetICP || strat.icpName || `ICP ${si + 1}`)}`;
          const whyLine = lm.whyItWorks ? `Why it works: ${clean(lm.whyItWorks)}` : "";
          const whenLine = lm.whenToUse ? `When to use: ${clean(lm.whenToUse)}` : "";

          let needed = estimateTextHeight(doc, headerLine, maxW) + estimateTextHeight(doc, icpLine, maxW) + (whyLine ? estimateTextHeight(doc, whyLine, maxW) : 0) + (whenLine ? estimateTextHeight(doc, whenLine, maxW) : 0) + 4;
          if (lm.includes && lm.includes.length > 0) {
            needed += lm.includes.length * 6;
          }
          y = ensureSpace(doc, y, needed);

          y = addWrappedText(doc, headerLine, PAGE_MARGIN, y, maxW);
          y = addWrappedText(doc, icpLine, PAGE_MARGIN, y, maxW);
          if (lm.includes && lm.includes.length > 0) {
            y = addBulletList(doc, lm.includes, PAGE_MARGIN, y, maxW);
          }
          if (whyLine) y = addWrappedText(doc, whyLine, PAGE_MARGIN, y, maxW);
          if (whenLine) y = addWrappedText(doc, whenLine, PAGE_MARGIN, y, maxW);
          y += 3;
        }
      }
      if (strat.eventLedGrowth) {
        y = addSubHeader(doc, "Event-Led Growth", y);
        if (strat.eventLedGrowth.onlineEvents) {
          y = addWrappedText(doc, "Online Events:", PAGE_MARGIN, y, maxW);
          for (const ev of strat.eventLedGrowth.onlineEvents) {
            y = addWrappedText(doc, `  ${clean(ev.format)}: ${clean(ev.topic)}`, PAGE_MARGIN, y, maxW);
          }
          y += 2;
        }
        if (strat.eventLedGrowth.offlineEvents) {
          y = addWrappedText(doc, "Offline Events:", PAGE_MARGIN, y, maxW);
          for (const ev of strat.eventLedGrowth.offlineEvents) {
            y = addWrappedText(doc, `  ${clean(ev.format)}: ${clean(ev.topic)}`, PAGE_MARGIN, y, maxW);
          }
          y += 2;
        }
        if (strat.eventLedGrowth.eventFunnel) {
          const funnel = strat.eventLedGrowth.eventFunnel;
          y = ensureSpace(doc, y, 15);
          y = addWrappedText(doc, "Event Funnel:", PAGE_MARGIN, y, maxW);
          if (funnel.preEvent) y = addWrappedText(doc, `  Pre-Event: ${clean(funnel.preEvent)}`, PAGE_MARGIN, y, maxW);
          if (funnel.duringEvent) y = addWrappedText(doc, `  During Event: ${clean(funnel.duringEvent)}`, PAGE_MARGIN, y, maxW);
          if (funnel.postEvent) y = addWrappedText(doc, `  Post-Event: ${clean(funnel.postEvent)}`, PAGE_MARGIN, y, maxW);
          y += 2;
        }
        if (strat.eventLedGrowth.conversionStrategy) {
          y = addWrappedText(doc, `Conversion: ${clean(strat.eventLedGrowth.conversionStrategy)}`, PAGE_MARGIN, y, maxW);
        }
      }
      y += 5;
    }
  }

  // Outreach Playbook
  const outreach = sessionData?.outreach_data?.result;
  y = newSection(doc, "Outreach Playbook");
  if (outreach?.playbooks) {
    for (const pb of outreach.playbooks.filter(Boolean)) {
      y = addSubHeader(doc, `${clean(pb.icpName)}${pb.audienceType ? ` (${pb.audienceType})` : ""}`, y);

      // ICP Context
      if (pb.icpContext) {
        y = ensureSpace(doc, y, 15);
        y = addSubHeader(doc, "ICP Context", y);
        if (pb.icpContext.who) y = addWrappedText(doc, `Who they are: ${clean(pb.icpContext.who)}`, PAGE_MARGIN, y, maxW);
        if (pb.icpContext.mindset) y = addWrappedText(doc, `Mindset: ${clean(pb.icpContext.mindset)}`, PAGE_MARGIN, y, maxW);
        if (pb.icpContext.careAbout && pb.icpContext.careAbout.length > 0) {
          y = addWrappedText(doc, "They care about:", PAGE_MARGIN, y, maxW);
          y = addBulletList(doc, pb.icpContext.careAbout, PAGE_MARGIN, y, maxW);
        }
        if (pb.icpContext.ignore && pb.icpContext.ignore.length > 0) {
          y = addWrappedText(doc, "They ignore:", PAGE_MARGIN, y, maxW);
          y = addBulletList(doc, pb.icpContext.ignore, PAGE_MARGIN, y, maxW);
        }
        y += 3;
      }

      // Strategic Approach
      if (pb.strategicApproach) {
        y = ensureSpace(doc, y, 15);
        y = addSubHeader(doc, "Strategic Approach", y);
        y = addWrappedText(doc, `Best Angle: ${clean(pb.strategicApproach.bestAngle)}`, PAGE_MARGIN, y, maxW);
        y = addWrappedText(doc, `Positioning Style: ${clean(pb.strategicApproach.positioningStyle)}`, PAGE_MARGIN, y, maxW);

        const detail = pb.strategicApproach.positioningDetail;
        if (detail) {
          if (detail.whatItMeans) y = addWrappedText(doc, `What it means: ${clean(detail.whatItMeans)}`, PAGE_MARGIN, y, maxW);
          if (detail.howToShowUp && detail.howToShowUp.length > 0) {
            y = addWrappedText(doc, "How to show up:", PAGE_MARGIN, y, maxW);
            y = addBulletList(doc, detail.howToShowUp, PAGE_MARGIN, y, maxW);
          }
          if (detail.whatToAvoid && detail.whatToAvoid.length > 0) {
            y = addWrappedText(doc, "What to avoid:", PAGE_MARGIN, y, maxW);
            y = addBulletList(doc, detail.whatToAvoid, PAGE_MARGIN, y, maxW);
          }
          if (detail.exampleOpener) {
            y = addWrappedText(doc, `Example Opener: "${clean(detail.exampleOpener)}"`, PAGE_MARGIN, y, maxW);
          }
        }
        if (pb.strategicApproach.whatNotToDo && pb.strategicApproach.whatNotToDo.length > 0) {
          y = addWrappedText(doc, "What NOT to do:", PAGE_MARGIN, y, maxW);
          y = addBulletList(doc, pb.strategicApproach.whatNotToDo, PAGE_MARGIN, y, maxW);
        }
        y += 3;
      }

      if (pb.personalisationTips) {
        y = addSubHeader(doc, "Personalisation Tips", y);
        y = addBulletList(doc, pb.personalisationTips, PAGE_MARGIN, y, maxW);
        y += 3;
      }
      if (pb.followUpSystem) {
        y = ensureSpace(doc, y, 15);
        y = addSubHeader(doc, "Follow-Up System", y);
        y = addWrappedText(doc, `Total Touches: ${pb.followUpSystem.totalTouches}`, PAGE_MARGIN, y, maxW);
        y = addWrappedText(doc, `Tone Evolution: ${clean(pb.followUpSystem.toneEvolution)}`, PAGE_MARGIN, y, maxW);
        if (pb.followUpSystem.escalationLogic) {
          y = addWrappedText(doc, `Escalation Logic: ${clean(pb.followUpSystem.escalationLogic)}`, PAGE_MARGIN, y, maxW);
        }
        y += 3;
      }
      if (pb.channelPlan) {
        y = addSubHeader(doc, "Channel & Content Plan", y);
        if (pb.channelPlan.platforms) y = addWrappedText(doc, `Best Platforms: ${pb.channelPlan.platforms.join(", ")}`, PAGE_MARGIN, y, maxW);
        if (pb.channelPlan.contentIdeas) { y += 2; y = addSubHeader(doc, "Content Ideas", y); y = addBulletList(doc, pb.channelPlan.contentIdeas, PAGE_MARGIN, y, maxW); }
        if (pb.channelPlan.outreachAngle) y = addWrappedText(doc, `How to Engage: ${clean(pb.channelPlan.outreachAngle)}`, PAGE_MARGIN, y, maxW);
        if (pb.channelPlan.conversionPath) y = addWrappedText(doc, `Conversion Path: ${clean(pb.channelPlan.conversionPath)}`, PAGE_MARGIN, y, maxW);
        y += 3;
      }
      if (pb.campaignIdeas) {
        y = addSubHeader(doc, "Campaign Ideas to Try", y);
        for (const c of pb.campaignIdeas) {
          y = addWrappedText(doc, `${clean(c.name)}: ${clean(c.description)}`, PAGE_MARGIN, y, maxW);
          y += 2;
        }
        y += 3;
      }
      if (pb.whatToAvoid) {
        y = addSubHeader(doc, "What to Avoid", y);
        y = addBulletList(doc, pb.whatToAvoid, PAGE_MARGIN, y, maxW);
      }
      y += 5;
    }
  }

  // Jewellery Design & Modelling (Bonus Add-Ons)
  if (showAddons) {
    y = newSection(doc, "Bonus Add-Ons");

    if (addonsPrompt) {
      y = addSubHeader(doc, "Jewellery Design Prompt Generator", y);
      const sel = jewelleryDesign?.selections || {};
      const selSummary = ["type", "style", "material", "gemstone", "mood"]
        .map(k => (sel[k] || []).join(", "))
        .filter(Boolean)
        .join(" | ");
      if (selSummary) { y = addWrappedText(doc, `Selections: ${selSummary}`, PAGE_MARGIN, y, maxW); y += 3; }
      y = addSubHeader(doc, "Generated Prompt", y);
      y = addWrappedText(doc, clean(addonsPrompt), PAGE_MARGIN, y, maxW);
      y += 5;
    }

    if (modellingData?.modelPrompts && modellingData.modelPrompts.length > 0) {
      y = ensureSpace(doc, y, 15);
      y = addSubHeader(doc, "AI Jewellery Modelling", y);
      if (modellingData.modelType) {
        y = addWrappedText(doc, `Jewellery Type: ${clean(modellingData.modelType)}`, PAGE_MARGIN, y, maxW);
        y += 3;
      }
      for (const p of modellingData.modelPrompts) {
        y = ensureSpace(doc, y, 8 + estimateTextHeight(doc, p.prompt, maxW));
        y = addSubHeader(doc, p.label, y);
        y = addWrappedText(doc, p.prompt, PAGE_MARGIN, y, maxW);
        y += 3;
      }
    }
  }

  // Thank You page
  y = newSection(doc, "Thank You");
  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const thankYouLines = [
    `Thank you for completing the B2B Growth Workshop, ${userName}.`,
    "Your strategy is built. Now it is time to execute.",
    "Start with one sequence, test it, and iterate. Consistency beats perfection.",
  ];
  for (const line of thankYouLines) {
    const wrapped = doc.splitTextToSize(line, maxW);
    for (const wl of wrapped) {
      doc.text(wl, PAGE_MARGIN, y);
      y += 7;
    }
    y += 3;
  }
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text("Powered by Myntmore", w / 2, y, { align: "center" });

  addPageNumbers(doc);
  doc.save(`B2B_Growth_Strategy_${userName.replace(/\s+/g, "_")}.pdf`);
}
