import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Download, RotateCcw } from "lucide-react";

interface FinalScreenProps {
  sessionData: any;
  onDownloadPDF: () => void;
  onRestart: () => void;
}

export function FinalScreen({ sessionData, onDownloadPDF, onRestart }: FinalScreenProps) {
  const icps = sessionData?.icp_data?.result || [];
  const vps = sessionData?.value_prop_data?.result || [];
  const outreach = sessionData?.outreach_data?.result || {};

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-extrabold gradient-text mb-2">Workshop Complete!</h2>
        <p className="text-muted-foreground text-lg">You have built a complete B2B growth strategy.</p>
      </div>

      <div className="glass-card p-6 text-left mb-8 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-primary">🎯 ICPs Identified</h4>
          <p className="text-sm text-muted-foreground">
            3 ICPs identified{icps[0]?.name ? `, starting with ${icps[0].name}` : ""}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-primary">⚙️ Core Positioning</h4>
          <p className="text-sm text-muted-foreground">
            {vps[0]?.yourMethod || "Your unique method and positioning"}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-primary">📡 Outreach Strategy</h4>
          <p className="text-sm text-muted-foreground italic">
            "{outreach?.strategySummary || "Your personalised outreach sequences are ready"}"
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={onDownloadPDF} className="gradient-bg hover:opacity-90 h-12 px-8 font-semibold">
          <Download className="w-4 h-4 mr-2" />
          Download Full Strategy PDF
        </Button>
        <Button variant="outline" onClick={onRestart} className="h-12 px-8">
          <RotateCcw className="w-4 h-4 mr-2" />
          Start a New Workshop
        </Button>
      </div>
    </motion.div>
  );
}
