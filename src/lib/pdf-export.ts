import jsPDF from "jspdf";
import { sanitizeAIText } from "./sanitize";
import { MYNTMORE_NOTION_LINK } from "./constants";
import myntmoreLogo from "@/assets/myntmore-logo.png";

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

const MARGIN = 40;
const PX_TO_PT = 0.75;
const PAGE_MARGIN = MARGIN * PX_TO_PT; // ~30pt

function addHeader(doc: jsPDF) {
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
  doc.text(clean(title), PAGE_MARGIN, 30);
  // Thin grey divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, 34, w - PAGE_MARGIN, 34);
  doc.setFont("helvetica", "normal");
  return 44;
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
      if (y > pageH) { doc.addPage(); addHeaderFooter(doc); y = 30; }
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

export async function generatePDF(sessionData: any) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const maxW = w - PAGE_MARGIN * 2;
  const userName = sessionData?.user_name || "Attendee";

  // Load logo
  let logoLoaded = false;
  try {
    const img = new Image();
    img.src = myntmoreLogo;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      setTimeout(reject, 3000);
    });
    const logoW = 30;
    const logoH = (img.height / img.width) * logoW;
    doc.addImage(img, "PNG", (w - logoW) / 2, 40, logoW, logoH);
    logoLoaded = true;
  } catch {
    // Skip logo
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

  // Table of Contents
  let y = newSection(doc, "Table of Contents");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const tocItems = ["Profile Analysis", "ICP 1", "ICP 2", "ICP 3", "Value Propositions", "Website Prompt", "Growth Strategy", "Outreach Playbook"];
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
  }

  // ICPs
  const icps = sessionData?.icp_data?.result || [];
  for (let i = 0; i < icps.length; i++) {
    const icp = icps[i];
    y = newSection(doc, `ICP ${i + 1}: ${clean(icp.name || "Untitled")}`);
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
  }

  // Value Propositions
  const vps = sessionData?.value_prop_data?.result || [];
  y = newSection(doc, "Value Propositions");
  for (let i = 0; i < vps.length; i++) {
    const vp = vps[i];
    y = addSubHeader(doc, `ICP ${i + 1}: ${clean(vp.icpName)}`, y);
    if (vp.corePromise) { y = addWrappedText(doc, `Core Promise: ${clean(vp.corePromise)}`, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.beforeState) { y = addSubHeader(doc, "Before", y); y = addBulletList(doc, vp.beforeState, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.afterState) { y = addSubHeader(doc, "After", y); y = addBulletList(doc, vp.afterState, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.threeStepSystem) {
      y = addSubHeader(doc, "3-Step System", y);
      for (const step of vp.threeStepSystem) {
        y = addWrappedText(doc, `${clean(step.step)}: ${clean(step.description)}`, PAGE_MARGIN, y, maxW);
        y += 2;
      }
    }
    if (vp.contentStrategy || vp.oneLiner) { y = addWrappedText(doc, `Content Strategy: ${clean(vp.contentStrategy || vp.oneLiner)}`, PAGE_MARGIN, y, maxW); y += 2; }
    if (vp.shortPitch) { y = addWrappedText(doc, `Pitch: ${clean(vp.shortPitch)}`, PAGE_MARGIN, y, maxW); y += 2; }
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
    const strategies = gtm.icpStrategies || (gtm.channels ? [gtm] : []);
    for (let si = 0; si < strategies.length; si++) {
      const strat = strategies[si];
      if (strat.icpName) { y = addSubHeader(doc, `ICP ${si + 1}: ${clean(strat.icpName)}`, y); y += 2; }
      if (strat.channels) {
        y = addSubHeader(doc, "Primary Channels", y);
        for (const ch of strat.channels) {
          y = addWrappedText(doc, `${clean(ch.name)} (Effort: ${ch.effort}, ROI: ${ch.roi})${ch.startHere ? " , START HERE" : ""}`, PAGE_MARGIN, y, maxW);
          y = addWrappedText(doc, clean(ch.useCase), PAGE_MARGIN, y, maxW);
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
          y = addWrappedText(doc, `${clean(p.type)}: ${clean(p.angle)}`, PAGE_MARGIN, y, maxW);
          y += 2;
        }
      }
      if (strat.leadMagnets) {
        y = addSubHeader(doc, "Lead Magnets", y);
        for (const lm of strat.leadMagnets) {
          y = addWrappedText(doc, `${clean(lm.name)} (${lm.type || lm.format}) for ${clean(lm.targetICP || strat.icpName || `ICP ${si + 1}`)}`, PAGE_MARGIN, y, maxW);
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
    for (const pb of outreach.playbooks) {
      y = addSubHeader(doc, clean(pb.icpName), y);
      if (pb.strategicApproach) {
        y = addWrappedText(doc, `Best Angle: ${clean(pb.strategicApproach.bestAngle)}`, PAGE_MARGIN, y, maxW);
        y = addWrappedText(doc, `Positioning Style: ${clean(pb.strategicApproach.positioningStyle)}`, PAGE_MARGIN, y, maxW);
        y += 3;
      }
      if (pb.personalisationTips) {
        y = addSubHeader(doc, "Personalisation Tips", y);
        y = addBulletList(doc, pb.personalisationTips, PAGE_MARGIN, y, maxW);
        y += 3;
      }
      if (pb.followUpSystem) {
        y = addWrappedText(doc, `Total Touches: ${pb.followUpSystem.totalTouches}`, PAGE_MARGIN, y, maxW);
        y = addWrappedText(doc, `Tone Evolution: ${clean(pb.followUpSystem.toneEvolution)}`, PAGE_MARGIN, y, maxW);
        y += 3;
      }
      if (pb.whatToAvoid) {
        y = addSubHeader(doc, "What to Avoid", y);
        y = addBulletList(doc, pb.whatToAvoid, PAGE_MARGIN, y, maxW);
      }
      y += 5;
    }
  }

  doc.save(`B2B_Growth_Strategy_${userName.replace(/\s+/g, "_")}.pdf`);
}
