import { ClipboardCheck, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WavyProgress } from '../WavyProgress';
import { CircularProgress } from '../ui/CircularProgress';
import type { WorkshopUser } from '../../types';

export interface IntakeStepProgressProps {
  step: number;
  authenticatedAdvisor: WorkshopUser | null;
  onClose: () => void;
}

export function IntakeStepProgress({
  step,
  authenticatedAdvisor,
  onClose,
}: IntakeStepProgressProps) {
  const getProgressValue = () => {
    if (step === 1) return 0;
    if (step === 1.5) return 25;
    if (step === 2) return 50;
    if (step === 2.5) return 75;
    return 100;
  };

  return (
    <div className="bg-workshop-bg text-workshop-text relative border-b border-workshop-border shrink-0">
      <div className="safe-top" />
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6 text-workshop-accent shrink-0" />
            <div>
              <h2 className="text-lg md:text-xl font-black tracking-tight uppercase leading-none">
                Vehicle Intake
              </h2>
              <p className="text-workshop-accent text-[10px] font-bold uppercase tracking-widest mt-1">
                {authenticatedAdvisor?.name || authenticatedAdvisor?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-workshop-surface rounded-full transition-colors text-workshop-muted hover:text-workshop-text cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full py-2 px-1 select-none">
          <div className="relative w-full h-8 flex items-center mb-1">
            <WavyProgress
              value={getProgressValue()}
              max={100}
              height={24}
              waveLength={32}
              amplitude={5.5}
              strokeWidth={5}
              className="absolute left-[18px] right-[18px] z-10"
            />

            {/* Step Nodes Row */}
            <div className="absolute inset-x-0 flex justify-between items-center z-20">
              {[1, 2, 3].map((s) => {
                const isCompleted = step > s && Math.floor(step) !== s;
                const isActive = Math.floor(step) === s;

                return (
                  <div key={s} className="relative flex items-center justify-center w-9 h-9">
                    {isActive && (
                      <CircularProgress
                        size={38}
                        color="var(--color-workshop-accent)"
                        strokeWidth="2.5px"
                        className="absolute z-20 pointer-events-none"
                      />
                    )}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border font-bold text-xs select-none z-10",
                        isCompleted
                          ? "bg-workshop-accent border-workshop-accent text-workshop-bg shadow-md shadow-workshop-accent/20"
                          : isActive
                          ? "bg-workshop-bg border-workshop-accent text-workshop-accent scale-110 shadow-lg shadow-workshop-accent/30"
                          : "bg-workshop-bg border-workshop-border text-workshop-muted"
                      )}
                    >
                      {isCompleted ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        s
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Labels for Steps */}
          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-workshop-muted opacity-80 mt-1 select-none">
            <span className={cn(Math.floor(step) >= 1 ? "text-workshop-accent" : "")}>
              Customer
            </span>
            <span className={cn(Math.floor(step) >= 2 ? "text-workshop-accent" : "")}>
              Vehicle
            </span>
            <span className={cn(Math.floor(step) >= 3 ? "text-workshop-accent" : "")}>
              Job Info
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
