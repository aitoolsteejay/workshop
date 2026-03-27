import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

interface WelcomeScreenProps {
  onStart: (name: string, email: string, phone: string) => void;
  resumeData?: { user_name: string; current_step: number } | null;
  onResume?: () => void;
  onStartFresh?: () => void;
}

export function WelcomeScreen({ onStart, resumeData, onResume, onStartFresh }: WelcomeScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email";
    if (!phone.trim()) errs.phone = "Phone number is required";
    else if (phone.replace(/\D/g, "").length < 10) errs.phone = "Minimum 10 digits required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onStart(name.trim(), email.trim(), phone.trim());
  };

  if (resumeData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 max-w-md w-full text-center"
        >
          <h2 className="text-2xl font-bold mb-2">Welcome back, {resumeData.user_name}!</h2>
          <p className="text-muted-foreground mb-6">Resume where you left off?</p>
          <div className="flex flex-col gap-3">
            <Button onClick={onResume} className="accent-bg hover:opacity-90 font-semibold">Continue</Button>
            <Button variant="ghost" onClick={onStartFresh} className="text-muted-foreground">Start Fresh</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-3 leading-tight">
            B2B Growth <span className="accent-text">Workshop</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Build your complete B2B growth strategy in 7 steps
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
          <div>
            <Label htmlFor="name" className="text-sm text-muted-foreground">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
              placeholder="Your full name"
              className="mt-1.5 bg-secondary border-border focus:border-primary"
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
              placeholder="you@company.com"
              className="mt-1.5 bg-secondary border-border focus:border-primary"
            />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm text-muted-foreground">Phone Number</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm text-muted-foreground bg-secondary border border-border rounded-md px-3 h-10 flex items-center shrink-0">+91</span>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: "" })); }}
                placeholder="9876543210"
                className="bg-secondary border-border focus:border-primary"
              />
            </div>
            {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
          </div>
          <Button type="submit" className="w-full accent-bg hover:opacity-90 font-semibold text-base h-12">
            Start Workshop →
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by Myntmore
        </p>
      </motion.div>
    </div>
  );
}
