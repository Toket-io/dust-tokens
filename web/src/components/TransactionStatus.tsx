"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { TransactionState } from "./ArcherDemo";

interface TransactionStatusProps {
  state: TransactionState;
}

const stateDescriptions: Record<TransactionState, string> = {
  sourcePending: "Processing source chain transaction...",
  zetaPending: "Source chain completed. Processing Zeta chain transaction...",
  destinationPending:
    "Zeta chain completed. Processing destination chain transaction...",
  completed: "All transactions completed successfully.",
};

export default function TransactionStatus({ state }: TransactionStatusProps) {
  const getStepStatus = (step: number) => {
    if (state === "sourcePending") return step === 0 ? "pending" : "idle";
    if (state === "zetaPending")
      return step <= 1 ? (step === 1 ? "pending" : "success") : "idle";
    if (state === "destinationPending")
      return step <= 2 ? (step === 2 ? "pending" : "success") : "idle";
    return "success"; // completed state
  };

  const getStepColor = (status: string) => {
    if (status === "success") return "bg-green-400";
    if (status === "pending") return "bg-blue-400";
    return "bg-gray-300";
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4">
      <div className="flex items-center space-x-2">
        {[0, 1, 2].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "h-4 w-4 rounded-full flex items-center justify-center",
                getStepColor(getStepStatus(step))
              )}
            >
              {getStepStatus(step) === "pending" && (
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              )}
            </div>
            {step < 2 && (
              <div
                className={cn(
                  "h-1 w-8",
                  getStepStatus(step) === "success"
                    ? "bg-green-400"
                    : "bg-gray-300"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="text-center text-sm font-medium text-gray-600">
        {stateDescriptions[state]}
      </div>
    </div>
  );
}
