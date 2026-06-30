import { useLocation } from "wouter";
import { ArrowLeft, Zap, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useConfig } from "@/contexts/ConfigContext";
import { FloatingCoins } from "@/components/FloatingCoins";

export default function LoginIssues() {
  const [, setLocation] = useLocation();
  const { config } = useConfig();

  return (
    <div className="min-h-screen flex flex-col bg-background font-body">
      {config.header.enabled && <Header />}

      <main className="relative flex-1 pb-16 overflow-hidden">
        {/* Aurora backdrop */}
        <div className="absolute inset-0 bg-hero-aurora">
          <FloatingCoins count={10} />
          <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full blur-3xl anim-aurora"
            style={{ background: "radial-gradient(circle, hsla(280,90%,60%,0.55), transparent 70%)" }} />
          <div className="absolute top-32 -right-16 w-80 h-80 rounded-full blur-3xl anim-aurora"
            style={{ background: "radial-gradient(circle, hsla(220,90%,55%,0.5), transparent 70%)", animationDelay: "3s" }} />
          <div className="absolute bottom-20 left-1/4 w-56 h-56 rounded-full blur-3xl anim-aurora"
            style={{ background: "radial-gradient(circle, hsla(48,95%,60%,0.32), transparent 70%)", animationDelay: "6s" }} />
          <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-14">
          <button
            onClick={() => window.history.back()}
            className="mb-6 group inline-flex items-center gap-2 text-amber-200 hover:text-amber-100 font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          <div className="relative rounded-3xl md:rounded-[2rem] bg-blackcard card-edge p-6 md:p-10 overflow-hidden anim-fade-up">
            <div className="pointer-events-none absolute -top-12 -left-12 w-96 h-32 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent anim-hologram" />

            <div className="flex items-center gap-4 mb-7">
              <div className="relative">
                <span className="absolute -inset-[2px] rounded-2xl bg-gold-gradient blur-[2px] opacity-80" />
                <div className="relative p-3 rounded-2xl bg-blackcard card-edge text-amber-300">
                  <Zap className="w-7 h-7" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-amber-300/80 text-xs font-bold uppercase tracking-widest mb-1">
                  <Sparkles className="h-3 w-3" /> Help Center
                </div>
                <h1 className="text-2xl md:text-4xl font-extrabold">
                  <span className="text-gold-gradient">Login & Access Issues</span>
                </h1>
              </div>
            </div>

            <div className="space-y-7 text-white/80 leading-relaxed">
              <p className="text-white/75">
                Having trouble logging in? Don't worry — we're here to help you get back to your vouchers quickly.
              </p>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-amber-200">1. Troubleshooting OTP Issues</h2>
                <ul className="list-disc pl-6 space-y-2 text-white/70 text-sm">
                  <li>Wait for at least 60 seconds before requesting a "Resend".</li>
                  <li>Check if your mobile network is stable.</li>
                  <li>Ensure you haven't blocked SMS from unknown senders in your phone settings.</li>
                  <li>Verify that you entered the correct mobile number.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-amber-200">2. "Account Locked" Error</h2>
                <p className="text-white/70 text-sm">
                  As a security measure, accounts are temporarily locked after 5 failed login attempts. Please wait
                  for <strong className="text-white">30 minutes</strong> before trying again, or use the "Forgot Password" link to reset your access.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-amber-200">3. Browser Compatibility</h2>
                <p className="text-white/70 text-sm">
                  Ensure you are using the latest version of your browser. We recommend{" "}
                  <strong className="text-white">Google Chrome</strong> or <strong className="text-white">Safari</strong> for the best
                  experience. Sometimes, clearing your browser cache/cookies can solve persistent login bugs.
                </p>
              </section>

              <div className="pt-7 border-t border-white/10 flex flex-wrap gap-3">
                <button
                  onClick={() => setLocation("/forgot-password")}
                  className="h-11 px-5 rounded-2xl border border-white/20 bg-white/5 text-white font-semibold hover:bg-white/10 active:scale-95 transition-all"
                >
                  Reset Password
                </button>
                <button className="h-11 px-6 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {config.footer.enabled && <Footer />}
    </div>
  );
}
