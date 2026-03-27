import jsPDF from "jspdf";
import { sanitizeAIText } from "./sanitize";
import { MYNTMORE_NOTION_LINK } from "./constants";

const LINKS = {
  linkedin: "https://www.linkedin.com/in/tejasjhaveri",
  instagram: "https://www.instagram.com/tejas_jhaveri",
  calendly: "https://calendly.com/founder-myntmore/30min",
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

function getUserColors(sessionData: any): { primary: number[]; secondary: number[]; textOnPrimary: number[]; bodyText: number[] } {
  const primaryHex = sessionData?.website_data?.primaryColor || "#FFC947";
  const secondaryHex = sessionData?.website_data?.secondaryColor || "#111111";

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const primary = hexToRgb(primaryHex);
  const secondary = hexToRgb(secondaryHex);
  const luminance = (secondary[0] * 0.299 + secondary[1] * 0.587 + secondary[2] * 0.114);
  const bodyText = luminance < 128 ? [220, 220, 220] : [40, 40, 40];
  const textOnPrimary = [0, 0, 0];

  return { primary, secondary, textOnPrimary, bodyText };
}

function addHeader(doc: jsPDF, colors: ReturnType<typeof getUserColors>) {
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const w = doc.internal.pageSize.getWidth();
  doc.text("Myntmore x B2B Growth Workshop", w - 15, 12, { align: "right" });
}

function addFooter(doc: jsPDF) {
  const h = doc.internal.pageSize.getHeight();
  const y = h - 10;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);

  const footerLinks = [
    { text: "TJ's LinkedIn", url: LINKS.linkedin, x: 15 },
    { text: "TJ's Instagram", url: LINKS.instagram, x: 55 },
    { text: "Book a Call", url: LINKS.calendly, x: 95 },
    { text: "Myntmore Services", url: LINKS.notion, x: 130 },
  ];

  for (const link of footerLinks) {
    doc.setTextColor(80, 130, 200);
    doc.text(link.text, link.x, y);
    const tw = doc.getTextWidth(link.text);
    doc.link(link.x, y - 3, tw, 5, { url: link.url });
  }
}

function addHeaderFooter(doc: jsPDF, colors: ReturnType<typeof getUserColors>) {
  addHeader(doc, colors);
  addFooter(doc);
}

function newSection(doc: jsPDF, title: string, colors: ReturnType<typeof getUserColors>) {
  doc.addPage();
  addHeaderFooter(doc, colors);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text(clean(title), 15, 25);
  doc.setFont("helvetica", "normal");
  return 38;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, colors: ReturnType<typeof getUserColors>, lineHeight: number = 5.5): number {
  if (!text) return y;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.bodyText[0], colors.bodyText[1], colors.bodyText[2]);
  const lines = doc.splitTextToSize(capitalize(clean(text)), maxWidth);
  const pageH = doc.internal.pageSize.getHeight() - 20;
  for (const line of lines) {
    if (y > pageH) {
      doc.addPage();
      addHeaderFooter(doc, colors);
      y = 25;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addBulletList(doc: jsPDF, items: string[], x: number, y: number, maxWidth: number, colors: ReturnType<typeof getUserColors>): number {
  if (!items || !Array.isArray(items)) return y;
  for (const item of items) {
    y = addWrappedText(doc, `• ${capitalize(clean(item))}`, x, y, maxWidth, colors);
    y += 1.5;
  }
  return y;
}

function addSubHeader(doc: jsPDF, text: string, y: number, colors: ReturnType<typeof getUserColors>): number {
  const pageH = doc.internal.pageSize.getHeight() - 20;
  if (y > pageH) { doc.addPage(); addHeaderFooter(doc, colors); y = 25; }
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text(clean(text), 15, y);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

export function generatePDF(sessionData: any) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const maxW = w - 30;
  const userName = sessionData?.user_name || "Attendee";
  const colors = getUserColors(sessionData);

  // Cover page
  addHeaderFooter(doc, colors);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("B2B Growth Strategy", w / 2, 80, { align: "center" });
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.bodyText[0], colors.bodyText[1], colors.bodyText[2]);
  doc.text(userName, w / 2, 95, { align: "center" });
  doc.setFontSize(11);
  doc.text(new Date().toLocaleDateString(), w / 2, 105, { align: "center" });
  doc.setFontSize(12);
  doc.setTextColor(120, 120, 120);
  doc.text("Powered by Myntmore", w / 2, 120, { align: "center" });

  // Table of Contents
  let y = newSection(doc, "Table of Contents", colors);
  const tocItems = ["Profile Analysis", "ICP 1", "ICP 2", "ICP 3", "Value Propositions", "Website Prompt", "GTM Strategy", "Outreach Playbook"];
  doc.setFontSize(11);
  doc.setTextColor(colors.bodyText[0], colors.bodyText[1], colors.bodyText[2]);
  tocItems.forEach((item, i) => {
    doc.text(`${i + 1}. ${item}`, 20, y);
    y += 8;
  });

  // Profile Analysis
  const profile = sessionData?.profile_data?.result;
  y = newSection(doc, "Profile Analysis", colors);
  if (profile) {
    const score = Math.min(profile.finalScore || 0, 100);
    y = addSubHeader(doc, `Score: ${score}/100, ${clean(profile.scoreMeaning)}`, y, colors);
    y += 3;
    if (profile.scoreBreakdown) {
      for (const [key, val] of Object.entries(profile.scoreBreakdown) as any) {
        y = addWrappedText(doc, `${capitalize(key)}: ${Math.min(val.score, 20)}/20, ${clean(val.explanation)}`, 15, y, maxW, colors);
        y += 2;
      }
    }
    y += 5;
    y = addSubHeader(doc, "What's Working", y, colors);
    y = addBulletList(doc, profile.whatsWorking, 15, y, maxW, colors);
    y += 3;
    y = addSubHeader(doc, "To Improve", y, colors);
    y = addBulletList(doc, profile.toImprove, 15, y, maxW, colors);
    y += 3;
    y = addSubHeader(doc, "Generated Headlines", y, colors);
    y = addBulletList(doc, profile.headlines, 15, y, maxW, colors);
  }

  // ICPs
  const icps = sessionData?.icp_data?.result || [];
  for (let i = 0; i < icps.length; i++) {
    const icp = icps[i];
    y = newSection(doc, `ICP ${i + 1}: ${clean(icp.name || "Untitled")}`, colors);
    const fields = [
      { key: "whoTheyAre", label: "Who They Are" },
      { key: "coreResponsibilities", label: "Core Responsibilities" },
      { key: "painPoints", label: "Pain Points" },
      { key: "goalsDesires", label: "Goals & Desires" },
      { key: "buyingTriggers", label: "Buying Triggers" },
      { key: "objections", label: "Objections" },
      { key: "psychology", label: "Psychology" },
      { key: "whereTheyHangOut", label: "Where They Hang Out" },
      { key: "howToPosition", label: "How to Position" },
    ];
    for (const f of fields) {
      const val = icp[f.key];
      if (!val) continue;
      y = addSubHeader(doc, f.label, y, colors);
      if (Array.isArray(val)) {
        y = addBulletList(doc, val, 15, y, maxW, colors);
      } else {
        y = addWrappedText(doc, val, 15, y, maxW, colors);
      }
      y += 3;
    }
  }

  // Value Propositions
  const vps = sessionData?.value_prop_data?.result || [];
  y = newSection(doc, "Value Propositions", colors);
  for (let i = 0; i < vps.length; i++) {
    const vp = vps[i];
    y = addSubHeader(doc, `ICP ${i + 1}: ${clean(vp.icpName)}`, y, colors);
    if (vp.corePromise) { y = addWrappedText(doc, `Core Promise: ${clean(vp.corePromise)}`, 15, y, maxW, colors); y += 2; }
    if (vp.beforeState) { y = addSubHeader(doc, "Before", y, colors); y = addBulletList(doc, vp.beforeState, 15, y, maxW, colors); y += 2; }
    if (vp.afterState) { y = addSubHeader(doc, "After", y, colors); y = addBulletList(doc, vp.afterState, 15, y, maxW, colors); y += 2; }
    if (vp.threeStepSystem) {
      y = addSubHeader(doc, "3-Step System", y, colors);
      for (const step of vp.threeStepSystem) {
        y = addWrappedText(doc, `${clean(step.step)}: ${clean(step.description)}`, 15, y, maxW, colors);
        y += 2;
      }
    }
    if (vp.oneLiner) { y = addWrappedText(doc, `One-liner: ${clean(vp.oneLiner)}`, 15, y, maxW, colors); y += 2; }
    if (vp.shortPitch) { y = addWrappedText(doc, `Pitch: ${clean(vp.shortPitch)}`, 15, y, maxW, colors); y += 2; }
    if (vp.positioning) {
      y = addSubHeader(doc, "Positioning Statement", y, colors);
      y = addWrappedText(doc, clean(vp.positioning), 15, y, maxW, colors);
      y += 2;
    }
    y += 5;
  }

  // Website Prompt
  y = newSection(doc, "Website Prompt", colors);
  y = addWrappedText(doc, clean(sessionData?.website_data?.generatedPrompt || "Not generated"), 15, y, maxW, colors);

  // GTM
  const gtm = sessionData?.gtm_data?.result;
  y = newSection(doc, "GTM Strategy", colors);
  if (gtm) {
    const strategies = gtm.icpStrategies || (gtm.channels ? [gtm] : []);
    for (let si = 0; si < strategies.length; si++) {
      const strat = strategies[si];
      if (strat.icpName) {
        y = addSubHeader(doc, `ICP ${si + 1}: ${clean(strat.icpName)}`, y, colors);
        y += 2;
      }
      if (strat.channels) {
        y = addSubHeader(doc, "Primary Channels", y, colors);
        for (const ch of strat.channels) {
          y = addWrappedText(doc, `${clean(ch.name)} (Effort: ${ch.effort}, ROI: ${ch.roi})${ch.startHere ? " , START HERE" : ""}`, 15, y, maxW, colors);
          y = addWrappedText(doc, clean(ch.useCase), 15, y, maxW, colors);
          y += 3;
        }
      }
      if (strat.timeline) {
        y = addSubHeader(doc, "Execution Timeline", y, colors);
        for (const phase of strat.timeline) {
          y = addWrappedText(doc, `${clean(phase.phase)}: ${clean(phase.title)}`, 15, y, maxW, colors);
          y = addBulletList(doc, phase.tasks, 15, y, maxW, colors);
          y += 3;
        }
      }
      if (strat.partners?.types) {
        y = addSubHeader(doc, "Partner Strategy", y, colors);
        for (const p of strat.partners.types) {
          y = addWrappedText(doc, `${clean(p.type)}: ${clean(p.angle)}`, 15, y, maxW, colors);
          y += 2;
        }
      }
      if (strat.leadMagnets) {
        y = addSubHeader(doc, "Lead Magnets", y, colors);
        for (const lm of strat.leadMagnets) {
          y = addWrappedText(doc, `${clean(lm.name)} (${lm.type || lm.format}) for ${clean(lm.targetICP || strat.icpName || `ICP ${si + 1}`)}`, 15, y, maxW, colors);
          y += 3;
        }
      }
      if (strat.eventLedGrowth) {
        y = addSubHeader(doc, "Event-Led Growth", y, colors);
        if (strat.eventLedGrowth.onlineEvents) {
          y = addWrappedText(doc, "Online Events:", 15, y, maxW, colors);
          for (const ev of strat.eventLedGrowth.onlineEvents) {
            y = addWrappedText(doc, `• ${clean(ev.format)}: ${clean(ev.topic)}`, 15, y, maxW, colors);
          }
          y += 2;
        }
        if (strat.eventLedGrowth.offlineEvents) {
          y = addWrappedText(doc, "Offline Events:", 15, y, maxW, colors);
          for (const ev of strat.eventLedGrowth.offlineEvents) {
            y = addWrappedText(doc, `• ${clean(ev.format)}: ${clean(ev.topic)}`, 15, y, maxW, colors);
          }
          y += 2;
        }
        if (strat.eventLedGrowth.conversionStrategy) {
          y = addWrappedText(doc, `Conversion: ${clean(strat.eventLedGrowth.conversionStrategy)}`, 15, y, maxW, colors);
        }
      }
      y += 5;
    }
  }

  // Outreach Playbook
  const outreach = sessionData?.outreach_data?.result;
  y = newSection(doc, "Outreach Playbook", colors);
  if (outreach?.playbooks) {
    for (const pb of outreach.playbooks) {
      y = addSubHeader(doc, clean(pb.icpName), y, colors);
      if (pb.strategicApproach) {
        y = addWrappedText(doc, `Best Angle: ${clean(pb.strategicApproach.bestAngle)}`, 15, y, maxW, colors);
        y = addWrappedText(doc, `Style: ${clean(pb.strategicApproach.positioningStyle)}`, 15, y, maxW, colors);
        y += 3;
      }
      if (pb.followUpSystem) {
        y = addWrappedText(doc, `Total Touches: ${pb.followUpSystem.totalTouches}`, 15, y, maxW, colors);
        y = addWrappedText(doc, `Tone Evolution: ${clean(pb.followUpSystem.toneEvolution)}`, 15, y, maxW, colors);
        y += 3;
      }
      if (pb.whatToAvoid) {
        y = addSubHeader(doc, "What to Avoid", y, colors);
        y = addBulletList(doc, pb.whatToAvoid, 15, y, maxW, colors);
      }
      y += 5;
    }
  }

  doc.save(`B2B_Growth_Strategy_${userName.replace(/\s+/g, "_")}.pdf`);
}
