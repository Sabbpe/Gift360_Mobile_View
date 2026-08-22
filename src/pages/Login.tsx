import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AlertCircle, ShieldCheck, ArrowUpRight, ChevronRight } from "lucide-react";
import { useSendOtp } from "@/hooks/useSendOtp";
import { useLoginWithOtp } from "@/hooks/useLoginWithOtp";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import rakhiBg from "@/assets/rakhi2.png";
import amazon from "@/assets/amazon.png";
import flipkart from "@/assets/flipkart.png";
import myntra from "@/assets/myntra.png";
import nike from "@/assets/nike.png";
import puma from "@/assets/puma.png";
import bata from "@/assets/bata.png";
import levis from "@/assets/levis.png";
import tatacliq from "@/assets/tatacliq.png";
import ajio from "@/assets/ajio.png";
import zomato from "@/assets/zomato.png";

const brandLogos = [
  { src: amazon, name: "Amazon" },
  { src: flipkart, name: "Flipkart" },
  { src: myntra, name: "Myntra" },
  { src: nike, name: "Nike" },
  { src: puma, name: "Puma" },
  { src: bata, name: "Bata" },
  { src: levis, name: "Levi's" },
  { src: tatacliq, name: "TataCliQ" },
  { src: ajio, name: "AJIO" },
  { src: zomato, name: "Zomato" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const isSessionExpired = searchParams.includes("session=expired");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [otpSent, setOtpSent] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const sendOtpMutation = useSendOtp();
  const loginWithOtpMutation = useLoginWithOtp();
  const { setUser } = useAuthContext();
  const { toast } = useToast();

  useEffect(() => {
    if (isSessionExpired) {
      const t = setTimeout(() => window.history.replaceState({}, "", "/login"), 5000);
      return () => clearTimeout(t);
    }
  }, [isSessionExpired]);

  const validateMobile = (m: string) => /^[0-9]{10}$/.test(m);
  const validateOtp = (o: string[]) => o.every(d => d.length === 1);

  const handleOtpInput = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 4);
    if (pasted.length > 0) {
      const newOtp = pasted.split("").concat(Array(4).fill("")).slice(0, 4);
      setOtp(newOtp);
      const nextEmpty = newOtp.findIndex(d => !d);
      otpRefs[nextEmpty === -1 ? 3 : nextEmpty].current?.focus();
    }
  };

  const handleSendOtp = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(""); setOtpMsg(""); setOtpSent(false); setOtp(["", "", "", ""]);
    if (!mobile.trim()) { setMobileError("Mobile number is required"); return; }
    if (!validateMobile(mobile)) { setMobileError("Please enter a valid 10-digit mobile number"); return; }
    setMobileError("");
    sendOtpMutation.mutate({ mobileNumber: mobile, email: email.trim() }, {
      onSuccess: (data) => {
        if (data.notRegistered) { setError("Mobile number not registered. Please register first."); return; }
        if (data.success) {
          setOtpSent(true);
          setOtpMsg(data.message || "OTP sent successfully");
          toast({ title: "OTP sent", description: data.message || "OTP sent to your mobile", duration: 3000 });
        }
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.response?.data || "Failed to send OTP";
        setError(typeof msg === "string" ? msg : "Failed to send OTP");
      },
    });
  };

  const handleOtpLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    const otpStr = otp.join("");
    if (!validateMobile(mobile)) { setError("Please enter a valid mobile number"); return; }
    if (!validateOtp(otp)) { setError("Please enter a valid 4-digit OTP"); return; }
    loginWithOtpMutation.mutate({ mobileNumber: mobile.trim(), otp: otpStr, email: email.trim() }, {
      onSuccess: (data) => {
        if (data.token && data.userInfo) {
          setUser({
            name: data.userInfo.name, email: data.userInfo.email, mobile: data.userInfo.mobile,
            token: data.token, clientId: data.userInfo.clientId,
          });
          toast({ title: "Welcome back!", description: data.message || "Login successful", duration: 3000 });
          setTimeout(() => setLocation("/"), 400);
        } else { setError(data.message || "OTP login failed"); }
      },
      onError: (err: any) => {
        const d = err?.response?.data;
        const msg = typeof d === "string" ? d : d?.message || "OTP login failed. Please try again.";
        setError(msg);
      },
    });
  };

  return (
    <main className="gift-page">
      <img src={rakhiBg} alt="" className="rakhi-backdrop" aria-hidden="true" />
      <div className="gift-shell">
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value stat-orange">10K+</span>
            <span className="stat-label">Registrations</span>
          </div>
          <div className="stat-card">
            <span className="stat-value stat-green">20K+</span>
            <span className="stat-label">Vouchers Bought</span>
          </div>
          <div className="stat-card">
            <span className="stat-value stat-purple">4.5K+</span>
            <span className="stat-label">Vouchers Gifted</span>
          </div>
        </div>
        <div className="cashback-banner">
          <span className="cashback-text">EARN UP TO <span className="cashback-highlight">20% CASHBACK</span></span>
          <span className="cashback-arrow">›</span>
        </div>
        <section className="login-card">
          <div className="card-heading">
            <div>
              <h3>Get Started</h3>
              <p>Login to explore Rakhi special gifts &amp; offers</p>
            </div>
          </div>

          {isSessionExpired && (
            <div className="session-alert">
              <AlertCircle size={14} />
              <span>Your session has expired. Please login again.</span>
            </div>
          )}

          {error && (
            <div className="error-alert">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <label className="field phone">
            <span className="country">IN&nbsp;&nbsp;<b>+91</b></span>
            <input
              aria-label="Mobile number"
              inputMode="numeric"
              placeholder="Enter mobile number"
              value={mobile}
              maxLength={10}
              onChange={(e) => {
                if (!/^[0-9]*$/.test(e.target.value)) return;
                setMobile(e.target.value); setMobileError(""); setError("");
              }}
              disabled={otpSent}
            />
          </label>
          {mobileError && <p className="field-error">{mobileError}</p>}

          {!otpSent ? (
            <button
              className="otp-button"
              onClick={handleSendOtp}
              disabled={!validateMobile(mobile) || sendOtpMutation.isPending}
            >
              {sendOtpMutation.isPending ? "Sending..." : <>Send OTP <ArrowUpRight size={20} /></>}
            </button>
          ) : (
            <div className="otp-section">
              <div className="otp-inputs" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpInput(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="otp-input"
                  />
                ))}
              </div>
              <button
                className="otp-button"
                onClick={handleOtpLogin}
                disabled={!validateOtp(otp) || loginWithOtpMutation.isPending}
              >
                {loginWithOtpMutation.isPending ? "Verifying..." : <>Verify &amp; Continue <ArrowUpRight size={18} /></>}
              </button>
              <p className="resend">
                Didn't receive?{" "}
                <button type="button" onClick={handleSendOtp}>Resend OTP</button>
              </p>
            </div>
          )}

          {otpMsg && otpSent && <p className="otp-success">✓ {otpMsg}</p>}

          <p className="security">
            <ShieldCheck size={16} /> We&apos;ll send a secure OTP to verify your number
          </p>
        </section>

        <p className="signup">
          Don&apos;t have an account?{" "}
          <Link href="/register">
            <button>Sign up</button>
          </Link>
        </p>

        <div className="offers">
          <div className="offer-rakhi">
            <svg width="100%" height="100%" viewBox="0 0 54 54" fill="none">
              <circle cx="27" cy="27" r="22" fill="#F472B6" opacity="0.3"/>
              <circle cx="27" cy="27" r="16" fill="#D946A8"/>
              {[0,60,120,180,240,300].map((a,i)=>(
                <ellipse key={i} cx="27" cy="19" rx="4" ry="7" fill="#F9A8D4" transform={`rotate(${a} 27 27)`}/>
              ))}
              <circle cx="27" cy="27" r="7" fill="#FDF2F8"/>
              <circle cx="26" cy="26" r="2" fill="white" opacity="0.7"/>
            </svg>
          </div>
          <div>
            <b>Rakhi Special Offers Live</b>
            <span>Tie the bond with love. Gift more, save more!</span>
          </div>
          <div className="offer-arrow"><ChevronRight size={18} /></div>
        </div>

        <div className="trusted">
          <span>TRUSTED BY 400+ BRANDS</span>
          <div className="brand-track">
            <div className="brand-row">
              {[...brandLogos, ...brandLogos].map((brand, i) => (
                <div key={i} className="brand-circle">
                  <img src={brand.src} alt={brand.name} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        .gift-page { min-height:100dvh; background:linear-gradient(180deg,#f0ebff 0%,#fdfaff 62%,#fffaff 100%); padding:0 0 24px; overflow:hidden; font-family:'DM Sans','Poppins',sans-serif; color:#25134f; position:relative; }
        .rakhi-backdrop { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; object-position:top center; z-index:0; pointer-events:none; }
        .gift-shell { width:min(100%,462px); margin:0 auto; position:relative; z-index:1; padding-top:50vh; }
        .stats-row { display:flex; gap:8px; width:90%; margin:0 auto 14px; }
        .stat-card { flex:1; background:rgba(255,255,255,0.88); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); border-radius:16px; padding:14px 6px; text-align:center; box-shadow:0 4px 14px rgba(100,72,150,0.08); border:1px solid rgba(255,255,255,0.6); }
        .stat-value { display:block; font:700 22px 'DM Sans',sans-serif; line-height:1; }
        .stat-label { display:block; margin-top:5px; font:500 9px 'DM Sans',sans-serif; color:#625a70; }
        .stat-orange { color:#e85d2a; }
        .stat-green { color:#16a34a; }
        .stat-purple { color:#6b21a8; }
        .cashback-banner { display:flex; align-items:center; width:90%; margin:0 auto 14px; padding:6px 14px; border-radius:50px; background:rgba(255,255,255,0.88); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); border:1.5px solid #f0a0c0; box-shadow:0 4px 14px rgba(100,72,150,0.08); animation:cashbackPulse 2.5s ease-in-out infinite; }
        .cashback-text { flex:1; font:600 10px 'DM Sans',sans-serif; color:#25134f; letter-spacing:0.3px; }
        .cashback-highlight { font-weight:800; color:#d946a8; }
        .cashback-arrow { font-size:16px; color:#c0c0c0; margin-left:4px; }
        @keyframes cashbackPulse { 0%,100%{ box-shadow:0 4px 14px rgba(100,72,150,0.08); border-color:#f0a0c0; } 50%{ box-shadow:0 4px 20px rgba(217,70,168,0.25); border-color:#d946a8; } }
        .login-card { margin:0 auto; width:84%; border-radius:25px; background:rgba(255,255,255,0.88); padding:22px 20px 18px; box-shadow:0 12px 28px rgba(100,72,150,0.13); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }
        .card-heading { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
        .card-heading h3 { margin:0; font:700 24px/1.1 'Poppins',sans-serif; color:#351265; letter-spacing:-0.7px; }
        .card-heading p { margin:4px 0 0; font-size:11.5px; color:#625a70; white-space:nowrap; }
        .session-alert, .error-alert { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:12px; margin-bottom:12px; font-size:10px; font-weight:500; }
        .session-alert { border:1px solid rgba(245,158,11,0.3); background:#fffbeb; color:#b45309; }
        .error-alert { border:1px solid rgba(220,38,38,0.3); background:rgba(220,38,38,0.08); color:rgb(220,38,38); }
        .field { display:flex; align-items:center; height:48px; border:1px solid #dfdbe3; border-radius:10px; margin-bottom:10px; color:#3b168b; overflow:hidden; cursor:text; }
        .field svg { margin-left:14px; flex:none; color:#7c7886; }
        .field input { width:100%; height:100%; border:0; outline:0; padding:0 14px; font:14px 'DM Sans',sans-serif; color:#24184b; background:transparent; }
        .field input::placeholder { color:#9c96a6; }
        .field input:disabled { opacity:0.6; cursor:not-allowed; }
        .country { height:100%; display:flex; align-items:center; padding:0 12px; border-right:1px solid #e4dfeb; font-size:11px; color:#24184b; flex-shrink:0; }
        .phone input { padding-left:14px; }
        .field-error { margin:-6px 0 8px; font-size:9px; font-weight:500; color:#dc2626; }
        .otp-button { width:100%; height:50px; border:0; border-radius:14px; background:linear-gradient(100deg,#6919e8,#9d22dc); color:#fff; font:700 14px 'DM Sans',sans-serif; display:flex; gap:8px; justify-content:center; align-items:center; cursor:pointer; box-shadow:0 6px 15px #7419d633; transition:transform 0.15s; }
        .otp-button:active { transform:translateY(1px); }
        .otp-button:disabled { opacity:0.5; cursor:not-allowed; }
        .otp-section { margin-top:12px; }
        .otp-inputs { display:flex; justify-content:center; gap:10px; margin-bottom:12px; }
        .otp-input { width:48px; height:48px; border:1px solid #dfdbe3; border-radius:10px; text-align:center; font-size:20px; font-weight:700; color:#24184b; background:white; outline:none; }
        .otp-input:focus { border-color:#9d22dc; box-shadow:0 0 0 2px rgba(157,34,220,0.15); }
        .resend { text-align:center; font-size:10px; color:#7c7886; margin-top:10px; }
        .resend button { border:0; background:none; color:#9721c3; font-weight:700; text-decoration:underline; cursor:pointer; padding:0; font-size:10px; }
        .otp-success { text-align:center; font-size:9px; font-weight:500; color:#16a34a; margin-top:6px; }
        .security { margin:12px 0 4px; display:flex; align-items:center; justify-content:center; gap:6px; color:#675e73; font-size:10.5px; }
        .security svg { color:#31108a; }
        .signup { text-align:center; font-size:12px; color:#291b4c; margin:14px 0 18px; }
        .signup button { border:0; background:none; color:#9721c3; text-decoration:underline; font-weight:700; font-size:12px; cursor:pointer; padding:0; }
        .offers { width:82%; min-height:62px; margin:auto; border:1.5px dashed #e789d2; border-radius:22px; display:flex; align-items:center; padding:8px 10px; gap:8px; color:#34115f; background:rgba(255,249,255,0.5); }
        .offer-rakhi { width:50px; height:50px; overflow:hidden; border:1px solid #f0cbe9; border-radius:50%; flex:none; background:#fff; box-shadow:0 2px 8px rgba(176,44,198,0.12); padding:2px; }
        .offers b, .offers span { display:block; font-size:11px; line-height:1.35; }
        .offers b { font-size:12px; } .offers span { color:#5b4c69; }
        .offer-arrow { width:28px; height:28px; flex:none; border-radius:50%; display:grid; place-items:center; background:#fff; color:#b02cc6; margin-left:auto; box-shadow:0 2px 6px rgba(176,44,198,0.1); }
        .trusted { margin:20px auto 0; width:82%; text-align:center; color:#655b74; font-size:10px; letter-spacing:0.15px; }
        .trusted > span { display:flex; align-items:center; gap:10px; white-space:nowrap; }
        .trusted > span:before, .trusted > span:after { content:""; height:1px; background:#e5dfe8; flex:1; }
        .brand-track { overflow:hidden; mask-image:linear-gradient(90deg,transparent 0%,black 6%,black 94%,transparent 100%); -webkit-mask-image:linear-gradient(90deg,transparent 0%,black 6%,black 94%,transparent 100%); margin:10px 0 0; }
        .brand-row { display:flex; gap:10px; width:max-content; animation:brandScroll 18s linear infinite; }
        .brand-circle { width:36px; height:36px; display:grid; place-items:center; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(191,182,204,0.27); flex-shrink:0; }
        .brand-circle img { width:22px; height:22px; object-fit:contain; opacity:0.75; }
        @keyframes brandScroll { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
        @media (min-width:600px) { .gift-page { padding:20px 0; } .gift-shell { border-radius:28px; overflow:hidden; box-shadow:0 14px 50px rgba(103,66,155,0.13); } }
      `}</style>
    </main>
  );
}
