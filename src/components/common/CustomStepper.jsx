import { Check } from "lucide-react";

export default function CustomStepper({ activeStep, steps }) {
  return (
    <div className="flex justify-between items-center mb-8 relative after:absolute after:inset-x-0 after:top-1/2 after:h-0.5 after:-translate-y-1/2 after:bg-border after:z-0">
      {steps.map((label, index) => {
        const isCompleted = index < activeStep;
        const isActive = index === activeStep;
        return (
          <div key={label} className="flex flex-col items-center w-full z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ring-4 ring-background ${isCompleted ? 'bg-primary text-primary-foreground' : isActive ? 'bg-primary border-2 border-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-input'}`}>
              {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
            </div>
            <span className={`mt-2 text-center text-xs sm:text-sm font-medium transition-colors duration-300 ${isActive ? 'text-primary' : 'text-foreground'}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
