"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const tokens = [
  { value: "btc", label: "Bitcoin (BTC)" },
  { value: "eth", label: "Ethereum (ETH)" },
  { value: "usdt", label: "Tether (USDT)" },
  { value: "bnb", label: "Binance Coin (BNB)" },
  { value: "usdc", label: "USD Coin (USDC)" },
  { value: "xrp", label: "Ripple (XRP)" },
  { value: "ada", label: "Cardano (ADA)" },
  { value: "doge", label: "Dogecoin (DOGE)" },
];

export default function TokenSwapSelector() {
  const [open, setOpen] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<
    { value: string; label: string; amount: string; isMax: boolean }[]
  >([]);

  const handleSelect = (token: { value: string; label: string }) => {
    if (
      selectedTokens.length < 5 &&
      !selectedTokens.some((t) => t.value === token.value)
    ) {
      setSelectedTokens([
        ...selectedTokens,
        { ...token, amount: "", isMax: false },
      ]);
    }
  };

  const handleRemove = (value: string) => {
    setSelectedTokens(selectedTokens.filter((t) => t.value !== value));
  };

  const handleAmountChange = (value: string, index: number) => {
    const newTokens = [...selectedTokens];
    newTokens[index].amount = value;
    newTokens[index].isMax = false;
    setSelectedTokens(newTokens);
  };

  const handleMaxToggle = (index: number) => {
    const newTokens = [...selectedTokens];
    newTokens[index].isMax = !newTokens[index].isMax;
    if (newTokens[index].isMax) {
      newTokens[index].amount = "";
    }
    setSelectedTokens(newTokens);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedTokens && selectedTokens.length > 0
              ? `${selectedTokens.length} token${
                  selectedTokens.length > 1 ? "s" : ""
                } selected`
              : "Select tokens..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search tokens..." />
            <CommandList>
              <CommandEmpty>No token found.</CommandEmpty>
              <CommandGroup>
                <CommandItem>Testing</CommandItem>
              </CommandGroup>
              <CommandGroup>
                {tokens.map((token) => (
                  <CommandItem
                    key={token.value}
                    onSelect={() => handleSelect(token)}
                    disabled={
                      selectedTokens.length >= 5 ||
                      selectedTokens.some((t) => t.value === token.value)
                    }
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedTokens.some((t) => t.value === token.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {token.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* {selectedTokens &&
        selectedTokens.length > 0 &&
        selectedTokens.map((token, index) => (
          <div key={token.value} className="flex items-center space-x-2">
            <div className="flex-grow">{token.label}</div>
            <Input
              type="number"
              placeholder="Amount"
              value={token.amount}
              onChange={(e) => handleAmountChange(e.target.value, index)}
              disabled={token.isMax}
              className="w-24"
            />
            <Button
              size="sm"
              variant={token.isMax ? "default" : "outline"}
              onClick={() => handleMaxToggle(index)}
            >
              Max
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleRemove(token.value)}
            >
              Remove
            </Button>
          </div>
        ))} */}
    </div>
  );
}
