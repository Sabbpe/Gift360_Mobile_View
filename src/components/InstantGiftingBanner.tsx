import { Gift, Store, Target } from "lucide-react";

type InstantGiftingBannerProps = {
  onExplore?: () => void;
};

export default function InstantGiftingBanner({ onExplore }: InstantGiftingBannerProps) {
  return (
    <section className="w-full">
      <div
        className="relative w-full overflow-hidden rounded-[10px] shadow-[2px_4px_4px_rgba(0,0,0,0.25)]"
        style={{
          minHeight: 120,
          background: "linear-gradient(94.33deg, #78DEFF -12.05%, #ABC2F5 41.5%, #2F4AB3 99.33%)",
        }}
      >
        <div
          aria-hidden
          className="absolute left-[-38px] top-[-56px] h-[131px] w-[10px] rotate-[29deg] rounded-full blur-[4px]"
          style={{ background: "linear-gradient(180deg, rgba(186, 186, 186, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%)" }}
        />

        <div className="absolute left-[16px] top-[16px] z-10 max-w-[138px]">
          <h2
            className="text-[18px] font-semibold leading-[23px] text-black"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Instant Gifting
            <br />
            in 3 Steps
          </h2>
        </div>

        <button
          type="button"
          onClick={onExplore}
          className="absolute left-[16px] top-[78px] z-10 flex h-[30px] w-[100px] items-center justify-center rounded-full text-[12px] font-semibold text-white active:scale-95"
          style={{
            fontFamily: "Poppins, sans-serif",
            background: "linear-gradient(92.69deg, #01E3EC 2.25%, #2E7DEA 95.91%)",
            boxShadow: "0px 1px 4px 2px rgba(42, 133, 234, 0.25)",
          }}
        >
          Explore Now
        </button>

        <div className="absolute left-[160px] top-[13px] h-[100px] w-[176px]">
          <svg
            aria-hidden
            className="absolute left-0 top-0 h-full w-full"
            viewBox="0 0 176 100"
            fill="none"
          >
            <path
              d="M24 60C41 34 52 28 71 25"
              stroke="#D86B23"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M69 24L59 22L61 31"
              stroke="#D86B23"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M68 55C82 35 96 29 114 26"
              stroke="#D86B23"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M110 25L100 23L102 32"
              stroke="#D86B23"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M126 71C141 70 151 76 161 87"
              stroke="#D86B23"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M156 84L166 84L162 93"
              stroke="#D86B23"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="absolute left-[8px] top-[43px] flex w-[72px] flex-col items-center">
            <div className="grid h-[40px] w-[40px] place-items-center rounded-[8px] bg-[#8CCBF8] shadow-[0_3px_10px_rgba(24,58,144,0.16)]">
              <Store className="h-[22px] w-[22px] text-white" strokeWidth={2.1} />
            </div>
            <p
              className="mt-[4px] text-center text-[8px] font-medium leading-[8px] text-white"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              1.Browse
              <br />
              Brands
            </p>
          </div>

          <div className="absolute left-[66px] top-[4px] flex w-[74px] flex-col items-center">
            <div className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[#F1F5FF] shadow-[0_3px_10px_rgba(24,58,144,0.12)]">
              <Target className="h-[24px] w-[24px] text-[#D94231]" strokeWidth={2.1} />
            </div>
            <p
              className="mt-[3px] text-center text-[8px] font-medium leading-[7px] text-white"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              2.Set
              <br />
              value
            </p>
          </div>

          <div className="absolute right-0 top-[40px] flex w-[70px] flex-col items-center">
            <div className="grid h-[40px] w-[40px] place-items-center rounded-[10px] bg-[#FFE0C9] shadow-[0_3px_10px_rgba(24,58,144,0.12)]">
              <Gift className="h-[22px] w-[22px] text-[#D6422E]" strokeWidth={2.1} />
            </div>
            <p
              className="mt-[4px] text-center text-[8px] font-medium leading-[7px] text-white"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              3.Get
              <br />
              Voucher
            </p>
          </div>
        </div>

        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-[104px] opacity-50"
          style={{
            background:
              "radial-gradient(circle at 72% 24%, rgba(255,255,255,0.3), transparent 28%), radial-gradient(circle at 88% 76%, rgba(255,255,255,0.12), transparent 34%)",
          }}
        />
      </div>
    </section>
  );
}