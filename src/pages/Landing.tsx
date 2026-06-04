import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Linkedin, Target, Rocket, Globe, Send, ArrowRight } from "lucide-react";
import tejasPhoto from "@/assets/tejas.png.asset.json";

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
    <div className="min-h-screen bg-gradient-to-tr from-[#ffe4d6] via-[#fbf1eb] to-[#e6dfff] text-black font-sans selection:bg-[#FFC947]/30">
      {/* Top nav */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <img src="/myntmore-logo.png" alt="MyntMore" className="h-8" onError={(e) => (e.currentTarget.style.display = "none")} />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-black/70">
            <a href="#services" className="hover:text-black transition">Services</a>
            <a href="#case-studies" className="hover:text-black transition">Case Studies</a>
            <a href="#resources" className="hover:text-black transition">Resources</a>
            <a href="#about" className="hover:text-black transition">About</a>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-sm font-medium text-black/70">Contact</span>
            <Link
              to="/workshop"
              className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full bg-white border border-black/5 shadow-sm text-black hover:shadow-md transition"
            >
              Book a Call <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-40 pb-32 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-black/5 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <span className="text-sm font-semibold text-black/80">
                Trusted by <span className="text-black">120+</span> Companies Worldwide
              </span>
            </div>
          </div>
          
          <h1 className="text-6xl sm:text-7xl md:text-[5.5rem] font-black tracking-tighter leading-[1.05] text-[#111]">
            Turn Your Expertise Into <br className="hidden sm:block" />
            a Business That <span className="italic font-serif font-light text-black/80">Sells Itself.</span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl text-black/60 max-w-2xl mx-auto leading-relaxed font-medium">
            A hands-on workshop by <span className="font-bold text-black">Tejas Jhaveri</span> — optimize your LinkedIn, define your ICP, and launch your GTM strategy in one session.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              to="/workshop"
              className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-4 rounded-full bg-white border border-black/10 text-black hover:shadow-lg transition-all w-full sm:w-auto"
            >
              Book Your Free Strategy Call <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="#results" className="text-base font-bold text-black/80 hover:text-black transition">
              See Our Results
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Outcomes */}
      <section id="results" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#111]">What you'll walk away with</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outcomes.map((o) => (
            <div key={o.title} className="rounded-3xl bg-white/40 backdrop-blur-xl border border-white/50 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/60 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center mb-6 shadow-sm border border-white">
                <o.icon className="w-6 h-6 text-amber-700" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#111]">{o.title}</h3>
              <p className="text-black/60 leading-relaxed font-medium">{o.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="services" className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#111]">Five steps to a complete strategy</h2>
        </div>
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.n} className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center bg-white/40 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl sm:text-5xl font-black text-amber-500/30 tracking-tighter w-20 shrink-0">{s.n}</div>
              <div>
                <h3 className="text-xl font-bold text-[#111]">{s.title}</h3>
                <p className="text-black/60 mt-2 font-medium">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-5xl mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row gap-12 items-center bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-white/50 shadow-lg">
          <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden shrink-0 border-4 border-white shadow-xl bg-gradient-to-br from-amber-100 to-orange-50">
            <img src={tejasPhoto.url} alt="Tejas Jhaveri" className="w-full h-full object-cover object-top" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-white/60 border border-black/5 text-xs font-bold tracking-wide uppercase text-black/60 mb-4">About the facilitator</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#111]">Tejas Jhaveri</h2>
            <p className="mt-6 text-black/70 leading-relaxed text-lg font-medium">
              Founder of <span className="font-bold text-black">MyntMore</span>, Tejas helps founders and operators turn their expertise into businesses that actually sell. This workshop, facilitated for <span className="font-bold text-black">TiE Chennai</span>, distills years of B2B growth experience into a single, hands-on session.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto bg-[#111] text-white rounded-[3rem] p-12 sm:p-20 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-amber-500/10"></div>
          <div className="relative z-10">
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-tight">
              Ready to build your <br className="hidden sm:block"/> <span className="italic font-serif font-light text-amber-200">brand and business?</span>
            </h2>
            <p className="mt-6 text-white/70 text-lg sm:text-xl max-w-xl mx-auto font-medium">
              Walk in with an idea. Walk out with a strategy, a website, and an outreach plan.
            </p>
            <div className="mt-12">
              <Link
                to="/workshop"
                className="inline-flex items-center gap-2 text-base font-bold px-8 py-4 rounded-full bg-amber-400 text-black hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.3)] transition-all"
              >
                Let's Get Started <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-sm font-medium text-black/40">
        © {new Date().getFullYear()} MyntMore · Workshop for TiE Chennai
      </footer>
    </div>
  );
}