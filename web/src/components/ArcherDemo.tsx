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
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

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
  { value: "btc", label: "Bitcoin (BTC)" },
  { value: "eth", label: "Ethereum (ETH)" },
  { value: "usdt", label: "Tether (USDT)" },
  { value: "bnb", label: "Binance Coin (BNB)" },
  { value: "usdc", label: "USD Coin (USDC)" },
  { value: "xrp", label: "Ripple (XRP)" },
  { value: "ada", label: "Cardano (ADA)" },
  { value: "doge", label: "Dogecoin (DOGE)" },
];

const networks = [
  { value: "ethereum", label: "Ethereum" },
  { value: "binance", label: "Binance Smart Chain" },
  { value: "polygon", label: "Polygon" },
  { value: "avalanche", label: "Avalanche" },
  { value: "solana", label: "Solana" },
];

export default function Component() {
  const [openToken, setOpenToken] = useState(false);
  const [openNetwork, setOpenNetwork] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<
    { value: string; label: string; amount: string; isMax: boolean }[]
  >([]);
  const [selectedNetwork, setSelectedNetwork] = useState<{
    value: string;
    label: string;
  } | null>(null);

  const handleSelectToken = (token: { value: string; label: string }) => {
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
                <div className="bg-white text-black rounded-full py-2 px-4 mb-4 flex items-center">
                  {token.label}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2"
                    onClick={() => handleRemoveToken(token.value)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
              <div>
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
                          {tokens.map((token) => (
                            <CommandItem
                              key={token.value}
                              onSelect={() => handleSelectToken(token)}
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
                              {token.label}
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
