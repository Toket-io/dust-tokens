import React, { useState } from "react";
import Image from "next/image";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArcherContainer, ArcherElement } from "react-archer";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const containerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: "750px",
  width: "100%",
  margin: "50px 0",
};

const columnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flex: 1,
};

const rootContainerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
};

const boxStyle = {
  padding: "10px",
  border: "1px solid black",
  marginBottom: "20px",
};

const tokens = [
  { value: "btc", label: "Bitcoin (BTC)", balance: 0.5 },
  { value: "eth", label: "Ethereum (ETH)", balance: 2.3 },
  { value: "usdt", label: "Tether (USDT)", balance: 1000 },
  { value: "bnb", label: "Binance Coin (BNB)", balance: 10 },
  { value: "usdc", label: "USD Coin (USDC)", balance: 500 },
  { value: "xrp", label: "Ripple (XRP)", balance: 0 },
  { value: "ada", label: "Cardano (ADA)", balance: 0 },
  { value: "doge", label: "Dogecoin (DOGE)", balance: 1000 },
];

const networks = [
  { value: "ethereum", label: "Ethereum", enabled: true },
  { value: "binance", label: "Binance Smart Chain", enabled: false },
  { value: "polygon", label: "Polygon", enabled: false },
  { value: "solana", label: "Solana", enabled: false },
];

export default function Component() {
  const [openToken, setOpenToken] = useState(false);
  const [openNetwork, setOpenNetwork] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<
    {
      value: string;
      label: string;
      amount: string;
      balance: number;
      isMax: boolean;
    }[]
  >([]);
  const [selectedNetwork, setSelectedNetwork] = useState<{
    value: string;
    label: string;
  } | null>(null);

  const handleSelectToken = (token: {
    value: string;
    label: string;
    balance: number;
  }) => {
    if (
      selectedTokens.length < 5 &&
      !selectedTokens.some((t) => t.value === token.value)
    ) {
      setSelectedTokens([
        ...selectedTokens,
        { ...token, amount: "", isMax: false },
      ]);
    } else {
      setSelectedTokens(selectedTokens.filter((t) => t.value !== token.value));
    }
    setOpenToken(false);
  };

  const handleRemoveToken = (tokenValue: string) => {
    setSelectedTokens(selectedTokens.filter((t) => t.value !== tokenValue));
  };

  const handleSelectNetwork = (network: { value: string; label: string }) => {
    setSelectedNetwork(network);
    setOpenNetwork(false);
  };

  const handleAmountChange = (tokenValue: string, amount: string) => {
    setSelectedTokens(
      selectedTokens.map((token) =>
        token.value === tokenValue ? { ...token, amount, isMax: false } : token
      )
    );
  };

  const handleMaxAmount = (tokenValue: string) => {
    setSelectedTokens(
      selectedTokens.map((token) =>
        token.value === tokenValue
          ? { ...token, amount: token.balance.toString(), isMax: true }
          : token
      )
    );
  };

  const sortedTokens = [...tokens].sort((a, b) => b.balance - a.balance);

  return (
    <div>
      <ArcherContainer strokeColor="white">
        <div style={containerStyle}>
          {/* Left column with elements */}
          <div style={columnStyle}>
            {selectedTokens.map((token, i) => (
              <ArcherElement
                key={`element${i}`}
                id={`element${i}`}
                relations={[
                  {
                    targetId: "root",
                    targetAnchor: "left",
                    sourceAnchor: "right",
                  },
                ]}
              >
                <div className="bg-white text-black rounded-lg py-2 px-4 mb-4 flex flex-col items-start w-64">
                  <div className="flex justify-between w-full mb-2">
                    <span>{token.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveToken(token.value)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center w-full">
                    <Input
                      type="number"
                      value={token.amount}
                      onChange={(e) =>
                        handleAmountChange(token.value, e.target.value)
                      }
                      className="w-full mr-2"
                      placeholder="Amount"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMaxAmount(token.value)}
                      className={cn(
                        token.isMax && "bg-primary text-primary-foreground"
                      )}
                    >
                      Max
                    </Button>
                  </div>
                </div>
              </ArcherElement>
            ))}
            <ArcherElement
              key={"select"}
              id={"select"}
              relations={[
                {
                  targetId: "root",
                  targetAnchor: "left",
                  sourceAnchor: "right",
                  style: { strokeDasharray: "5,5" },
                },
              ]}
            >
              <div className="w-64">
                <Popover open={openToken} onOpenChange={setOpenToken}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openToken}
                      className="w-full justify-between"
                    >
                      Select token
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search tokens..." />
                      <CommandList>
                        <CommandEmpty>No token found.</CommandEmpty>
                        <CommandGroup>
                          {sortedTokens.map((token) => (
                            <CommandItem
                              key={token.value}
                              onSelect={() => handleSelectToken(token)}
                              className={cn(
                                token.balance === 0 && "opacity-50"
                              )}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTokens.some(
                                    (t) => t.value === token.value
                                  )
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="flex-1">{token.label}</span>
                              <CommandShortcut>
                                {token.balance.toFixed(2)}
                              </CommandShortcut>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </ArcherElement>
          </div>

          {/* Root element in the center */}
          <div style={rootContainerStyle}>
            <ArcherElement
              id="root"
              relations={[
                {
                  targetId: "right-element",
                  targetAnchor: "left",
                  sourceAnchor: "right",
                },
              ]}
            >
              <div>
                <Image
                  src="/assets/zetachain-icon.svg"
                  alt="Zetachain Logo"
                  width={120}
                  height={120}
                />
                {/* <h1 className="text-2xl text-center font-bold mt-2">
                  Zetachain
                </h1> */}
              </div>
            </ArcherElement>
          </div>

          {/* Additional element to the right of the root */}
          <div style={columnStyle}>
            <ArcherElement id="right-element">
              <div>
                <Popover open={openNetwork} onOpenChange={setOpenNetwork}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openNetwork}
                      className="w-full justify-between"
                    >
                      {selectedNetwork?.label || "Select Network"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search networks..." />
                      <CommandList>
                        <CommandEmpty>No network found.</CommandEmpty>
                        <CommandGroup>
                          {networks.map((network) => (
                            <CommandItem
                              key={network.value}
                              disabled={!network.enabled}
                              onSelect={() => handleSelectNetwork(network)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedNetwork?.value === network.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {network.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </ArcherElement>
          </div>
        </div>
      </ArcherContainer>
    </div>
  );
}
