import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PhoneShell } from "@/components/onboarding/PhoneShell";
import { SplashScreen } from "@/components/onboarding/SplashScreen";
import { Onboarding1 } from "@/components/onboarding/Onboarding1";
import { Onboarding2 } from "@/components/onboarding/Onboarding2";
import { Onboarding3 } from "@/components/onboarding/Onboarding3";
import gift360Logo from "@/assets/gift360-logo.png";
import voucherCover from "@/assets/voucher-cover.png";
import voucherRevealed from "@/assets/voucher-revealed.png";
import student from "@/assets/onboard-student.png";
import businessman from "@/assets/onboard-businessman.png";
import itEmployee from "@/assets/onboard-itemployee.png";
import couple from "@/assets/onboard-couple.png";
import housewife from "@/assets/onboard-housewife.png";
import collegegirl from "@/assets/onboard-collegegirl.png";
import senior from "@/assets/onboard-senior.png";
import shopkeeper from "@/assets/onboard-shopkeeper.png";
import gigworker from "@/assets/onboard-gigworker.png";

const ONBOARDING_KEY = "g360_onboarding_v3";

type Screen = "splash" | "onb1" | "onb2" | "onb3";

export default function Onboarding() {
  const screens = useMemo<Screen[]>(
    () => ["splash", "onb1", "onb2", "onb3"],
    []
  );
  const [screenIndex, setScreenIndex] = useState(0);
  const screen = screens[screenIndex];

  useEffect(() => {
    const imagesToWarm = [
      gift360Logo,
      voucherCover,
      voucherRevealed,
      student,
      businessman,
      itEmployee,
      couple,
      housewife,
      collegegirl,
      senior,
      shopkeeper,
      gigworker,
    ];

    imagesToWarm.forEach((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (screen === "splash") {
      const timer = setTimeout(() => setScreenIndex(1), 3600);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  const goNext = () =>
    setScreenIndex((current) => Math.min(current + 1, screens.length - 1));

  const goBack = () =>
    setScreenIndex((current) => Math.max(current - 1, 0));

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    window.location.assign("/");
  };

  const renderScreen = () => {
    switch (screen) {
      case "splash":
        return <SplashScreen onNext={goNext} onSkip={finish} />;
      case "onb1":
        return (
          <Onboarding1
            onNext={goNext}
            onSkip={finish}
          />
        );
      case "onb2":
        return (
          <Onboarding2
            onNext={goNext}
            onSkip={finish}
          />
        );
      case "onb3":
        return (
          <Onboarding3
            onBack={goBack}
            onStart={finish}
          />
        );
    }
  };

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center py-6 px-4"
      style={{
        background:
          "radial-gradient(circle at 20% 10%, hsl(252 70% 96%) 0%, hsl(0 0% 100%) 50%, hsl(252 60% 95%) 100%)",
      }}
    >
      <PhoneShell>
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) goNext();
              if (info.offset.x > 60 && screen !== "splash") goBack();
            }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </PhoneShell>
    </main>
  );
}
