import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { getRewardStatus } from "@/api/rewardApi";
import krishnaImg from "@/assets/krishnauth.png";

type Props = {
  onClick: () => void;
};

export default function JanmashtamiQuizCallout({ onClick }: Props) {
  const { user } = useAuthContext();

  const { data: reward } = useQuery({
    queryKey: ["rewardStatus", user?.clientId],
    queryFn: () => getRewardStatus(user!.clientId),
    enabled: !!user?.clientId,
  });

  const alreadyAttempted = !!reward?.hasReward;

  if (alreadyAttempted) return null;

  return (
    <section className="px-[21px] pt-[14px]">
      <button
        type="button"
        onClick={onClick}
        className="relative w-full overflow-hidden rounded-[16px] shadow-[4px_4px_12px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-transform"
      >
        {/* Background image */}
        <div className="relative h-[140px]">
          <img
            src={krishnaImg}
            alt="Janmashtami"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          {/* Subtle gradient overlay for depth */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(10,20,80,0.15) 0%, rgba(10,20,80,0.05) 50%, rgba(10,20,80,0.2) 100%)",
            }}
          />

          {/* CTA button positioned bottom-right */}
          <div className="absolute bottom-3 right-3 z-10">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)",
                boxShadow: "0 4px 16px rgba(26,35,126,0.4)",
                animation: "wave-pulse 2s ease-in-out infinite",
              }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Try My Quiz
            </span>
          </div>
        </div>

        {/* Wave animation keyframes */}
        <style>{`
          @keyframes wave-pulse {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
        `}</style>
      </button>
    </section>
  );
}
