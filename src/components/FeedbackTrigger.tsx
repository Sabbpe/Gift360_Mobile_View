import { X, MessageSquare } from "lucide-react";

interface FeedbackTriggerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function FeedbackTrigger({ open, onClose, onSubmit }: FeedbackTriggerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xs bg-white rounded-2xl shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center px-5 pt-6 pb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 mb-3">
            <MessageSquare className="h-6 w-6 text-purple-600" strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">We value your feedback</h3>
          <p className="text-xs text-gray-500 mb-4">Help us improve your Gift360 experience</p>
          <button
            onClick={onSubmit}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
          >
            Give Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
