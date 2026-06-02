import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Linkedin, Target, Rocket, Globe, Send, ArrowRight } from "lucide-react";

const outcomes = [
  { icon: Linkedin, title: "Optimized LinkedIn", desc: "A sharp headline & About section that positions you as the go-to." },
  { icon: Target, title: "Clear ICP & Value Prop", desc: "Know exactly who you serve and why they should pick you." },
  { icon: Rocket, title: "GTM Strategy", desc: "A go-to-market plan with lead magnet ideas you can ship this week." },
  { icon: Globe, title: "Your Business Website", desc: "A complete website prompt — built live during the workshop." },
  { icon: Send, title: "Outreach That Works", desc: "Personalized outreach ideas tailored to each of your ICPs." },
];

const steps = [
  { n: "01", title: "Tell us what you do", desc: "Share what you do and who you serve." },
  { n: "02", title: "Optimize your LinkedIn", desc: "We rewrite your headline and About section." },
  { n: "03", title: "Define ICP & Value Prop", desc: "Get razor-sharp on customer and offer." },
  { n: "04", title: "GTM & Lead Magnets", desc: "Your go-to-market plan with ideas to ship." },
  { n: "05", title: "Website & Outreach", desc: "Build your site and outreach playbook." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Top nav */}
      <header className="border-b border-black/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/myntmore-logo.png" alt="MyntMore" className="h-8" onError={(e) => (e.currentTarget.style.display = "none")} />
          <Link
            to="/workshop"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-md bg-[#FFC947] text-black hover:opacity-90 transition"
          >
            Start the Workshop <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-black/60 mb-6">
            MyntMore Workshop · TiE Chennai
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Turn Your Expertise Into a <br className="hidden sm:block" />
            Business That <span className="bg-[#FFC947] px-3 py-1">Sells Itself</span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl text-black/70 max-w-2xl mx-auto leading-relaxed">
            A hands-on workshop by <span className="font-semibold text-black">Tejas Jhaveri</span> — optimize your LinkedIn, define your ICP, and launch your GTM strategy in one session.
          </p>
          <div className="mt-10">
            <Link
              to="/workshop"
              className="inline-flex items-center gap-2 text-base font-bold px-8 py-4 rounded-md bg-[#FFC947] text-black hover:opacity-90 transition shadow-[0_8px_0_0_#000]"
            >
              Start the Workshop <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Outcomes */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-black/10">
        <div className="mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-black/60">Outcomes</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">What you'll walk away with</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {outcomes.map((o) => (
            <div key={o.title} className="border-2 border-black p-6 hover:shadow-[6px_6px_0_0_#000] transition-shadow bg-white">
              <div className="w-11 h-11 rounded-md bg-[#FFC947] flex items-center justify-center mb-5">
                <o.icon className="w-5 h-5 text-black" />
              </div>
              <h3 className="text-lg font-bold mb-2">{o.title}</h3>
              <p className="text-sm text-black/70 leading-relaxed">{o.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-black/10">
        <div className="mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-black/60">How it works</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">Five steps to a complete strategy</h2>
        </div>
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.n} className="grid grid-cols-[auto_1fr] gap-6 items-start border-b border-black/10 pb-6 last:border-b-0">
              <div className="text-4xl sm:text-5xl font-extrabold text-[#FFC947] tracking-tight w-20">{s.n}</div>
              <div>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-black/70 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-black/10">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10 items-start">
          <div className="w-48 h-48 bg-black/5 border-2 border-black flex items-center justify-center">
            <span className="text-sm text-black/40">Photo</span>
          </div>
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-black/60">About the facilitator</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">Tejas Jhaveri</h2>
            <p className="mt-5 text-black/70 leading-relaxed text-lg">
              Founder of <span className="font-semibold text-black">MyntMore</span>, Tejas helps founders and operators turn their expertise into businesses that actually sell. This workshop, facilitated for <span className="font-semibold text-black">TiE Chennai</span>, distills years of B2B growth experience into a single, hands-on session.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Ready to build your <span className="text-[#FFC947]">brand and business?</span>
          </h2>
          <p className="mt-5 text-white/70 text-lg max-w-xl mx-auto">
            Walk in with an idea. Walk out with a strategy, a website, and an outreach plan.
          </p>
          <div className="mt-10">
            <Link
              to="/workshop"
              className="inline-flex items-center gap-2 text-base font-bold px-8 py-4 rounded-md bg-[#FFC947] text-black hover:opacity-90 transition"
            >
              Let's Get Started <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 py-8 text-center text-sm text-black/50">
        © {new Date().getFullYear()} MyntMore · Workshop for TiE Chennai
      </footer>
    </div>
  );
}