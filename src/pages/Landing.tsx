import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Linkedin, Target, Rocket, Globe, Send, ArrowRight, Users, TrendingUp, MessageSquare, FileText } from "lucide-react";
import tejasPhoto from "@/assets/tejas-photo.jpg";

const outcomes = [
  { icon: Linkedin, title: "LinkedIn That Converts", desc: "A rewritten headline and About section that positions you as the authority, so the right people reach out to you." },
  { icon: Target, title: "Crystal-Clear ICP", desc: "Know exactly who you're selling to, what keeps them up at night, and what triggers them to buy." },
  { icon: TrendingUp, title: "Your Value Proposition", desc: "A sharp, tailored pitch for each customer segment. No more generic messaging that gets ignored." },
  { icon: Rocket, title: "GTM Strategy + Lead Magnets", desc: "A go-to-market plan with lead magnet ideas you can actually ship this week to start building pipeline." },
  { icon: Globe, title: "Website Copy, Done", desc: "A complete, AI-generated website prompt built live during the workshop, ready to hand off and publish." },
  { icon: Send, title: "Outreach Playbook", desc: "Personalized outreach sequences for each ICP, so you can start real conversations that lead to revenue." },
];

const steps = [
  { n: "01", title: "Tell us about your business", desc: "Share what you do, who you serve, your revenue stage, and where you want to grow." },
  { n: "02", title: "Optimize your LinkedIn", desc: "We rewrite your headline and About section to attract your ideal clients, not just connections." },
  { n: "03", title: "Define your ICP & Value Prop", desc: "Get razor-sharp on your customer profile and craft messaging that actually resonates." },
  { n: "04", title: "Build your GTM & Lead Magnets", desc: "Map out your go-to-market approach with lead magnet ideas you can ship immediately." },
  { n: "05", title: "Generate your website & outreach", desc: "Walk away with a complete website prompt and a personalized outreach playbook for each ICP." },
];

const stats = [
  { value: "300+", label: "Clients Served" },
  { value: "$80M+", label: "Revenue Driven" },
  { value: "100K+", label: "Students Taught" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#ffe4d6] via-[#fbf1eb] to-[#e6dfff] text-black font-sans selection:bg-[#FFC947]/30">
      {/* Top Logo */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <img src="/workshop-static/myntmore-logo.png" alt="MyntMore" className="h-16 w-auto" onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>
      </div>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-40 pb-32 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-black/5 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <span className="text-sm font-semibold text-black/80">
                Trusted by <span className="text-black">300+</span> Founders & CXOs Worldwide
              </span>
            </div>
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-[5.5rem] font-black tracking-tighter leading-[1.05] text-[#111]">
            Stop Waiting for Leads. <br className="hidden sm:block" />
            Build a System That <span className="italic font-serif font-light text-black/80">Brings Them.</span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl text-black/60 max-w-2xl mx-auto leading-relaxed font-medium">
            A hands-on AI-powered workshop by <span className="font-bold text-black">Tejas Jhaveri</span> to sharpen your positioning, define your ICP, and walk away with a complete outbound strategy in one session.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              to="/workshop"
              className="inline-flex items-center justify-center gap-2 text-base font-bold px-8 py-4 rounded-full bg-[#111] text-white hover:shadow-xl hover:bg-black transition-all w-full sm:w-auto"
            >
              Start the Free Workshop <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-16">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-black text-[#111]">{s.value}</div>
                <div className="text-sm font-semibold text-black/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Outcomes */}
      <section id="results" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-sm font-bold tracking-widest uppercase text-amber-600 mb-4">What you'll walk away with</p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#111]">Six assets. One session. Zero fluff.</h2>
          <p className="mt-4 text-black/60 text-lg max-w-xl mx-auto font-medium">
            Every output is AI-generated specifically for your business, your audience, and your goals.
          </p>
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
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-sm font-bold tracking-widest uppercase text-amber-600 mb-4">How it works</p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#111]">Five steps to a complete growth strategy</h2>
          <p className="mt-4 text-black/60 text-lg max-w-xl mx-auto font-medium">
            Answer a few questions about your business and let the AI do the heavy lifting.
          </p>
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
        <div className="flex flex-col md:flex-row gap-12 items-start bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-white/50 shadow-lg">
          <div className="shrink-0 flex flex-col items-center gap-6 md:w-64">
            <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-amber-100 to-orange-50">
              <img src={tejasPhoto} alt="Tejas Jhaveri" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              {[
                { icon: Users, label: "300+ Clients" },
                { icon: TrendingUp, label: "$80M+ Revenue Driven" },
                { icon: MessageSquare, label: "100K+ Students Taught" },
                { icon: FileText, label: "TEDx & IIM Speaker" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm font-semibold text-black/60">
                  <Icon className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <span className="inline-block px-3 py-1 rounded-full bg-white/60 border border-black/5 text-xs font-bold tracking-wide uppercase text-black/60 mb-4">About Tejas</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#111]">Tejas Jhaveri</h2>
            <p className="text-black/50 font-semibold text-sm mt-1 mb-6">4x Entrepreneur · AI-led B2B Lead-Gen · Founder, Myntmore</p>

            <div className="space-y-4 text-black/70 leading-relaxed font-medium">
              <p>
                I spend my days building AI-powered outbound systems that create a predictable, qualified B2B pipeline for founders and CXOs. That's the work I'm known for, and honestly, the work I love.
              </p>
              <p>
                I'm a 4x entrepreneur and AI-led B2B lead-gen nerd who's spent the last decade figuring out one thing: how to turn cold strangers into warm conversations, and warm conversations into revenue.
              </p>
              <p>
                Today, I run <span className="font-bold text-black">Myntmore</span>, a B2B lead-gen and outbound agency built for one mission: helping founders stop depending on luck, referrals, or random spikes, and instead build outbound systems that run (and bring leads) every single day.
              </p>
              <p>
                I've built these engines for founders, CXOs, consultants, and B2B teams across SaaS, tech, consulting, manufacturing, recruitment, and pretty much every industry that relies on conversations to close deals.
              </p>
              <p>
                So far, I've worked with <span className="font-bold text-black">300+ clients</span> and helped drive <span className="font-bold text-black">$80M+ in revenue</span>, using a mix of clear ICPs, sharp messaging, and AI agents that do the heavy lifting so your calendar fills with the right people.
              </p>
              <p>
                Before this, I built and exited <span className="font-bold text-black">Flintstop</span> after scaling it to 8000+ daily orders and $6M ARR, but even that journey pointed me back to one truth: growth never comes from a great product alone. It comes from distribution, positioning, and the ability to get in front of the right people, at the right time, with the right message.
              </p>
              <p>
                Over the years, I've also taught growth and GTM to <span className="font-bold text-black">100,000+ students</span> as a Growth Marketing professor, spoken at TEDx and IIMs, and invested in founders solving real problems. But everything I teach comes from operating, experimenting, and running outbound systems at scale myself.
              </p>
              <p>
                And when I'm not deep in lead-gen models or AI workflows, I'm probably gaming, making music, or trying to win at badminton or pool.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto bg-[#111] text-white rounded-[3rem] p-12 sm:p-20 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-amber-500/10"></div>
          <div className="relative z-10">
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-tight">
              Ready to build a pipeline <br className="hidden sm:block" /> <span className="italic font-serif font-light text-amber-200">that works every day?</span>
            </h2>
            <p className="mt-6 text-white/70 text-lg sm:text-xl max-w-xl mx-auto font-medium">
              Walk in with your business. Walk out with your ICP, your messaging, your website copy, and an outreach playbook. All built for you by AI.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/workshop"
                className="inline-flex items-center gap-2 text-base font-bold px-8 py-4 rounded-full bg-amber-400 text-black hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.3)] transition-all"
              >
                Start the Free Workshop <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="mt-6 text-white/40 text-sm font-medium">Free · No credit card</p>
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-sm font-medium text-black/40">
        © {new Date().getFullYear()} MyntMore · All rights reserved
      </footer>
    </div>
  );
}
