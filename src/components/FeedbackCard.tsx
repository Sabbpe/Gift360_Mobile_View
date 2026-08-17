import { MessageSquare } from "lucide-react";

interface FeedbackCardProps {
  onOpen: () => void;
}

export default function FeedbackCard({ onOpen }: FeedbackCardProps) {
  return (
    <section className="px-[21px] pt-[20px]">
      <div
        onClick={onOpen}
        className="relative overflow-hidden rounded-[18px] cursor-pointer active:scale-[0.98] transition-transform"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #5B3FD9 50%, #3B82F6 100%)",
          boxShadow: "0 8px 24px rgba(124, 58, 237, 0.25)",
        }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute right-4 top-2 h-[60px] w-[60px] rounded-full border-2 border-white" />
          <div className="absolute right-12 bottom-1 h-[40px] w-[40px] rounded-full border-2 border-white" />
          <div className="absolute left-[60%] top-[-10px] h-[30px] w-[30px] rounded-full border border-white" />
        </div>

        <div className="relative flex items-center gap-3 px-4 py-3.5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <MessageSquare className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight">
              How are we doing?
            </p>
            <p className="text-[11px] text-white/75 mt-0.5">
              Share quick feedback — takes 30 sec
            </p>
          </div>
          <div className="flex-shrink-0 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-[11px] font-semibold text-white">Give Feedback</span>
          </div>
        </div>
      </div>
    </section>
  );
}
