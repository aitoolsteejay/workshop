import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WelcomeScreen } from "@/components/workshop/WelcomeScreen";
import { Step1Onboarding } from "@/components/workshop/Step1Onboarding";
import { Step2Profile } from "@/components/workshop/Step2Profile";
import { Step3ICP } from "@/components/workshop/Step3ICP";
import { Step4ValueProp } from "@/components/workshop/Step4ValueProp";
import { Step5Website } from "@/components/workshop/Step5Website";
import { Step6GTM } from "@/components/workshop/Step6GTM";
import { Step7Outreach } from "@/components/workshop/Step7Outreach";
import { FinalScreen } from "@/components/workshop/FinalScreen";
import { ProgressBar } from "@/components/workshop/ProgressBar";
import { ProgressSidebar } from "@/components/workshop/ProgressSidebar";
import { WorkshopFooter } from "@/components/workshop/WorkshopFooter";

import {
  getSessionId, createSession, loadSession, saveProgress,
  clearSession, loadBackup
} from "@/lib/workshop-store";
import { generatePDF } from "@/lib/pdf-export";
import { useToast } from "@/hooks/use-toast";


const TOTAL_STEPS = 8;

const Index = () => {
  const [step, setStep] = useState(-1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [fromBackup, setFromBackup] = useState(false);
  const { toast } = useToast();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const existingId = getSessionId();
    if (existingId) {
      loadSession(existingId).then(data => {
        if (data) {
          setSessionData(data);
          setSessionId(existingId);
          setStep(-2);
          if (!data.session_id && data.user_name) setFromBackup(true);
        } else {
          setStep(0);
        }
      }).catch(() => {
        const backup = loadBackup();
        if (backup) {
          setSessionData(backup);
          setSessionId(existingId);
          setStep(-2);
          setFromBackup(true);
        } else {
          setStep(0);
        }
      });
    } else {
      setStep(0);
    }
  }, []);

  const debouncedSave = useCallback((field: string, data: any) => {
    if (!sessionId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProgress(sessionId, { [field]: data });
    }, 1000);
  }, [sessionId]);

  const handleStart = async (name: string, email: string, phone: string) => {
    const id = await createSession(name, email, phone);
    setSessionId(id);
    setSessionData({ user_name: name, user_email: email, user_phone: phone, current_step: 1 });
    setStep(1);
    toast({ title: "✓ Saved", description: "Session started", duration: 3000 });
  };

  const handleResume = () => {
    setStep(sessionData?.current_step || 1);
    if (fromBackup) {
      toast({ title: "⚠️ Loaded from local backup", description: "Some data may not be fully synced", variant: "destructive", duration: 5000 });
    }
  };

  const handleStartFresh = () => {
    clearSession();
    setSessionData(null);
    setSessionId(null);
    setStep(0);
  };

  const goToStep = (s: number) => {
    setStep(s);
    if (sessionId) saveProgress(sessionId, { current_step: s });
    setSessionData((prev: any) => ({ ...prev, current_step: s }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveField = (field: string, data: any, opts?: { silent?: boolean }) => {
    setSessionData((prev: any) => ({ ...prev, [field]: data }));
    debouncedSave(field, data);
    if (!opts?.silent) toast({ title: "✓ Saved", duration: 3000 });
  };

  const handleManualSave = () => {
    if (sessionId && sessionData) {
      saveProgress(sessionId, { current_step: step });
      toast({ title: "✓ Progress saved", duration: 2000 });
    }
  };

  if (step === -1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const showSidebar = step > 0 && step <= TOTAL_STEPS;

  return (
    <div className="min-h-screen pb-8">
      <ProgressBar currentStep={step > 0 ? step : 0} totalSteps={TOTAL_STEPS} onSave={step > 0 && step <= TOTAL_STEPS ? handleManualSave : undefined} onRestart={step > 0 && step <= TOTAL_STEPS ? handleStartFresh : undefined} />

      <div className={step > 0 ? "flex" : ""}>
        {showSidebar && (
          <ProgressSidebar currentStep={step} onNavigate={goToStep} />
        )}

        <div className={step > 0 ? "flex-1 pt-20 px-4" : ""}>
          <AnimatePresence mode="wait">
            {step === -2 && (
              <WelcomeScreen onStart={handleStart} resumeData={sessionData} onResume={handleResume} onStartFresh={handleStartFresh} />
            )}
            {step === 0 && (
              <WelcomeScreen onStart={handleStart} />
            )}
            {step === 1 && (
              <Step1Onboarding data={sessionData?.onboarding_data} onSave={(d, opts) => saveField("onboarding_data", d, opts)} onNext={() => goToStep(2)} />
            )}
            {step === 2 && (
              <Step2Profile data={sessionData?.profile_data} userName={sessionData?.user_name} onSave={(d, opts) => saveField("profile_data", d, opts)} onNext={() => goToStep(3)} onBack={() => goToStep(1)} />
            )}
            {step === 3 && (
              <Step3ICP data={sessionData?.icp_data} profileData={sessionData?.profile_data} onboardingData={sessionData?.onboarding_data} onSave={(d, opts) => saveField("icp_data", d, opts)} onNext={() => goToStep(4)} onBack={() => goToStep(2)} />
            )}
            {step === 4 && (
              <Step4ValueProp data={sessionData?.value_prop_data} icpData={sessionData?.icp_data} profileData={sessionData?.profile_data} onboardingData={sessionData?.onboarding_data} onSave={(d) => saveField("value_prop_data", d)} onNext={() => goToStep(5)} onBack={() => goToStep(3)} />
            )}
            {step === 5 && (
              <Step5Website data={sessionData?.website_data} icpData={sessionData?.icp_data} valuePropData={sessionData?.value_prop_data} profileData={sessionData?.profile_data} onboardingData={sessionData?.onboarding_data} userName={sessionData?.user_name} onSave={(d, opts) => saveField("website_data", d, opts)} onNext={() => goToStep(6)} onBack={() => goToStep(4)} />
            )}
            {step === 6 && (
              <Step6GTM data={sessionData?.gtm_data} icpData={sessionData?.icp_data} valuePropData={sessionData?.value_prop_data} onboardingData={sessionData?.onboarding_data} profileData={sessionData?.profile_data} onSave={(d) => saveField("gtm_data", d)} onNext={() => goToStep(7)} onBack={() => goToStep(5)} />
            )}
            {step === 7 && (
              <Step7Outreach data={sessionData?.outreach_data} icpData={sessionData?.icp_data} valuePropData={sessionData?.value_prop_data} profileData={sessionData?.profile_data} onboardingData={sessionData?.onboarding_data} onSave={(d, opts) => saveField("outreach_data", d, opts)} onNext={() => goToStep(8)} onBack={() => goToStep(6)} />
            )}
            {step === 8 && (
              <FinalScreen sessionData={sessionData} onDownloadPDF={() => generatePDF(sessionData)} onRestart={handleStartFresh} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <WorkshopFooter />
    </div>
  );
};

export default Index;
