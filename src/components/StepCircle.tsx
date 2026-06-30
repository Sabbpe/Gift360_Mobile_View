// components/StepCircle.tsx
// Vertical workflow steps with icons and descriptions
import type { ReactNode } from 'react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: ReactNode;
  status?: 'completed' | 'pending';
  onClick?: () => void;
  actionText?: string;
}

interface StepCircleProps {
  steps: Step[];
}

export default function StepCircle({ steps }: StepCircleProps) {
  return (
    <div className="flex flex-col gap-3 items-center">
      {/* Steps */}
      <div className="relative w-full flex flex-col gap-3">
        {steps.map((step) => (
          <div key={step.id} className="flex justify-center">
            <div 
              className="w-[316px] h-[60px] rounded-[10px] bg-white shadow-[0_4px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_14px_rgba(0,0,0,0.12)] transition-all px-4 py-4 flex items-center gap-3 cursor-pointer"
              onClick={step.onClick}
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-[20px] h-[20px] flex items-center justify-center">
                {step.icon}
              </div>

              {/* Text content */}
              <div className="flex-1 flex flex-col justify-center gap-0.5">
                <h3 className="text-[12px] font-semibold leading-none text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {step.title}
                </h3>
                <p className="text-[8px] leading-[10px] font-normal text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
