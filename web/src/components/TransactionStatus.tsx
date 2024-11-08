"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Step, Status, StepStatus } from "./ArcherDemo";

interface TransactionStatusProps {
  steps: Record<Step, StepStatus>;
  currentStep: Step | null;
}

const stepDescriptions: Record<Step, Record<Status, string>> = {
  source: {
    idle: "Waiting to process source transaction...",
    pending: "Processing source transaction...",
    success: "Source transaction completed successfully.",
    error: "Error occurred during source transaction.",
  },
  zeta: {
    idle: "Waiting to process Zeta transaction...",
    pending: "Processing Zeta transaction...",
    success: "Zeta transaction completed successfully.",
    error: "Error occurred during Zeta transaction.",
  },
  destination: {
    idle: "Waiting to process destination transaction...",
    pending: "Processing destination transaction...",
    success: "Destination transaction completed successfully.",
    error: "Error occurred during destination transaction.",
  },
};

export default function TransactionStatus({
  steps,
  currentStep,
}: TransactionStatusProps) {
  const getStepColor = (step: Step) => {
    const status = steps[step].status;
    if (status === "success") return "bg-green-400";
    if (status === "error") return "bg-red-400";
    if (status === "pending") return "bg-blue-400";
    return "bg-gray-300";
  };

  const getCurrentDescription = () => {
    if (currentStep) {
      return stepDescriptions[currentStep][steps[currentStep].status];
    }
    if (Object.values(steps).every((step) => step.status === "success")) {
      return "All transactions completed successfully.";
    }
    if (Object.values(steps).some((step) => step.status === "error")) {
      return "An error occurred during the transaction process.";
    }
    return "Waiting to start transactions...";
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4">
      <div className="flex items-center space-x-0">
        {(["source", "zeta", "destination"] as Step[]).map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "h-4 w-4 rounded-full flex items-center justify-center",
                getStepColor(step)
              )}
            >
              {steps[step].status === "pending" && (
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              )}
            </div>
            {index < 2 && (
              <div
                className={cn(
                  "h-1 w-8",
                  steps[step].status === "success"
                    ? "bg-green-400"
                    : "bg-gray-300"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="text-center text-sm font-medium text-gray-600">
        {getCurrentDescription()}
      </div>
    </div>
  );
}
