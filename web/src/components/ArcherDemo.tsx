import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, ChevronsUpDown, RotateCcw, X } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwapPreviewDrawer } from "./SwapPreviewDrawer";
import { ethers } from "ethers";
import { toast } from "sonner";
import TransactionStatus from "./TransactionStatus";
import {
  getReadOnlyEvmDustTokensContract,
  readLocalnetAddresses,
  EvmDustTokens,
} from "@/lib/zetachainUtils";
import { Network, SelectedToken, Token, TransactionState } from "@/lib/types";
import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";

const networks: Network[] = [
  {
    id: 31337,
    value: "ethereum",
    label: "Ethereum",
    enabled: true,
    rpc: "http://localhost:8545",
    contractAddress: readLocalnetAddresses("ethereum", "EvmDustTokens"),
    zrc20Address: readLocalnetAddresses("zetachain", "ZRC-20 ETH on 5"),
    nativeToken: {
      name: "Ether (Native)",
      symbol: "ETH",
      decimals: 18,
      balance: 0,
      address: "0x0000000000000000000000000000000000000000",
    },
  },
  {
    id: 0,
    value: "binance",
    label: "Binance Smart Chain",
    enabled: false,
    rpc: "",
    contractAddress: "",
    zrc20Address: "",
    nativeToken: {
      name: "Ether (Native)",
      symbol: "ETH",
      decimals: 18,
      balance: 0,
      address: "0x0000000000000000000000000000000000000000",
    },
  },
];

export default function Component() {
  const [balances, setBalances] = useState<Token[]>([]);
  const [outputBalances, setOutputBalances] = useState<Token[]>([]);
  const [selectedOutputToken, setSelectedOutputToken] = useState<Token | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [openToken, setOpenToken] = useState(false);
  const [openNetwork, setOpenNetwork] = useState(false);
  const [openOutputToken, setOpenOutputToken] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<SelectedToken[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [transactionStatus, setTransactionStatus] =
    useState<TransactionState>("notStarted");

  const { address, isConnected } = useAccount();

  // MARK: Source chain contract hooks
  const { data: rawBalances, isPending: balancesPending } = useReadContract({
    abi: EvmDustTokens.abi,
    address: readLocalnetAddresses(
      "ethereum",
      "EvmDustTokens"
    ) as `0x${string}`,
    functionName: "getBalances",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  useWatchContractEvent({
    abi: EvmDustTokens.abi,
    address: readLocalnetAddresses(
      "ethereum",
      "EvmDustTokens"
    ) as `0x${string}`,
    eventName: "SwappedAndDeposited",
    args: {
      executor: address,
    },
    enabled: !!address,
    onLogs(logs) {
      // Loop through logs and check if the executor is the recipient
      logs.forEach((log) => {
        const { executor, swaps, totalTokensReceived } = log.args;
        if (executor.toLowerCase() === address?.toLowerCase()) {
          setTransactionStatus("destinationPending");
        }
      });
    },
  });

  useEffect(() => {
    if (rawBalances) {
      const formattedBalances = formatTokenBalances(rawBalances);
      setBalances(formattedBalances);
    }
  }, [rawBalances]);

  // MARK: Destination chain contract hooks
  const {
    data: rawBalancesDestination,
    isPending: balancesPendingDestination,
  } = useReadContract({
    abi: EvmDustTokens.abi,
    address: selectedNetwork?.contractAddress as `0x${string}`,
    chainId: selectedNetwork?.id,
    functionName: "getBalances",
    args: [address],
    query: {
      enabled: !!address && !!selectedNetwork,
    },
  });

  useWatchContractEvent({
    abi: EvmDustTokens.abi,
    address: selectedNetwork?.contractAddress as `0x${string}`,
    chainId: selectedNetwork?.id,
    eventName: "SwappedAndWithdrawn",
    args: {
      receiver: address,
    },
    enabled: !!address && !!selectedNetwork,
    onLogs(logs) {
      // Loop through logs and check if the executor is the recipient
      logs.forEach((log) => {
        const { receiver, outputToken, totalTokensReceived } = log.args;
        // Filter based on signer
        if (receiver.toLowerCase() === address?.toLowerCase()) {
          const formattedAmount = ethers.utils.formatUnits(
            totalTokensReceived,
            selectedOutputToken?.decimals
          );

          // Mark transaction as complete and show success
          setTransactionStatus("completed");
          toast.success(
            "Your tokens have been successfully swapped and bridged!",
            {
              description: `You have received: ${formattedAmount} ${selectedOutputToken?.symbol}`,
              position: "top-center",
              duration: 8000,
            }
          );
        }
      });
    },
  });

  useEffect(() => {
    if (rawBalancesDestination) {
      const formattedBalances = formatTokenBalances(rawBalancesDestination);
      setOutputBalances(formattedBalances);
    }
  }, [rawBalancesDestination]);

  const formatTokenBalances = (rawBalances: any) => {
    const addresses = rawBalances[0];
    const names = rawBalances[1];
    const symbols = rawBalances[2];
    const decimals = rawBalances[3];
    const tokenBalances = rawBalances[4];

    return addresses.map((address: string, index: number) => ({
      address,
      name: names[index],
      symbol: symbols[index],
      decimals: decimals[index],
      balance: Number(
        ethers.utils.formatUnits(tokenBalances[index], decimals[index])
      ),
    }));
  };

  const handleSelectToken = (token: Token) => {
    if (
      selectedTokens.length < 5 &&
      !selectedTokens.some((t) => t.symbol === token.symbol)
    ) {
      setSelectedTokens([
        ...selectedTokens,
        { ...token, amount: "", isMax: false, hasPermit2Allowance: true },
      ]);
    } else {
      setSelectedTokens(
        selectedTokens.filter((t) => t.symbol !== token.symbol)
      );
    }
    setOpenToken(false);
  };

  const handleSelectOutputToken = (token: Token) => {
    setSelectedOutputToken(token);
    setOpenOutputToken(false);
  };

  const handleRemoveToken = (tokenValue: string) => {
    setSelectedTokens(selectedTokens.filter((t) => t.symbol !== tokenValue));
  };

  const handleSelectNetwork = (network: { value: string; label: string }) => {
    setSelectedNetwork(network);
    setOpenNetwork(false);
  };

  const handleAmountChange = async (tokenValue: string, amount: string) => {
    setSelectedTokens(
      selectedTokens.map((token) =>
        token.symbol === tokenValue
          ? {
              ...token,
              amount,
              isMax: false,
            }
          : token
      )
    );
  };

  const handleMaxAmount = (tokenValue: string) => {
    setSelectedTokens(
      selectedTokens.map((token) =>
        token.symbol === tokenValue
          ? { ...token, amount: token.balance.toString(), isMax: true }
          : token
      )
    );
  };

  const handleReset = () => {
    setSelectedTokens([]);
    setSelectedOutputToken(null);
    setSelectedNetwork(null);
    setTransactionStatus("notStarted");
  };

  const autoSelectTokens = () => {
    const tokensWithBalance = balances.filter((token) => token.balance > 0);
    tokensWithBalance.sort((a, b) => b.balance - a.balance);

    const selected = tokensWithBalance.flatMap((token) => {
      return {
        ...token,
        amount: token.balance.toString(),
        isMax: true,
      };
    });

    setSelectedTokens(selected);
  };

  const sortedTokens = [...balances].sort((a, b) => b.balance - a.balance);

  return (
    <div>
      <ArcherContainer strokeColor="white">
        <div className="flex justify-between items-center height-full width-full">
          {/* Source chain settings */}
          <div className="flex flex-col flex-1 items-center justify-center">
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
                <Card className="rounded-2xl mb-4 items-start w-64">
                  <CardHeader>
                    <div className="flex justify-between items-center w-full">
                      <CardTitle>{token.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveToken(token.symbol)}
                        disabled={loading || transactionStatus !== "notStarted"}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center w-full">
                      <Input
                        type="number"
                        value={token.amount}
                        disabled={transactionStatus !== "notStarted"}
                        onChange={(e) =>
                          handleAmountChange(token.symbol, e.target.value)
                        }
                        className="w-full mr-2"
                        placeholder="Amount"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMaxAmount(token.symbol)}
                        disabled={loading || transactionStatus !== "notStarted"}
                        className={cn(
                          token.isMax && "bg-primary text-primary-foreground"
                        )}
                      >
                        Max
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
                <Card className="rounded-2xl items-start w-64">
                  <CardContent>
                    <div className="items-center w-full pt-6 space-y-2">
                      <Popover open={openToken} onOpenChange={setOpenToken}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openToken}
                            className="w-full justify-between"
                            disabled={
                              balancesPending ||
                              loading ||
                              transactionStatus !== "notStarted"
                            }
                          >
                            {balancesPending ? "Loading..." : "Select token"}
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
                                    key={token.symbol}
                                    onSelect={() => handleSelectToken(token)}
                                    className={cn(
                                      token.balance === 0 && "opacity-50"
                                    )}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedTokens.some(
                                          (t) => t.symbol === token.symbol
                                        )
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <span className="flex-1">{token.name}</span>
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
                      <p className="text-center">or</p>
                      <Button
                        variant="secondary"
                        size="full"
                        onClick={autoSelectTokens}
                        disabled={loading || transactionStatus !== "notStarted"}
                      >
                        Auto-select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ArcherElement>
          </div>

          {/* Zetachain Logo */}
          <div className="flex flex-col flex-1 items-center justify-center">
            <ArcherElement
              id="root"
              relations={[
                {
                  targetId: "center-element",
                  targetAnchor: "left",
                  sourceAnchor: "right",
                },
              ]}
            >
              <div>
                <span className="relative flex h-32	w-32">
                  <span
                    className={`${
                      !["notStarted", "completed"].includes(transactionStatus)
                        ? "animate-ping"
                        : ""
                    } absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}
                  ></span>
                  <Image
                    src="/assets/zetachain-icon.svg"
                    alt="Zetachain Logo"
                    width={120}
                    height={120}
                    className="relative inline-flex rounded-full h-32 w-32"
                  />
                </span>
              </div>
            </ArcherElement>
            {transactionStatus !== "notStarted" ? (
              <TransactionStatus state={transactionStatus} />
            ) : (
              <div className="flex items-center justify-center mt-4">
                <SwapPreviewDrawer
                  selectedTokens={selectedTokens}
                  selectedNetwork={selectedNetwork}
                  selectedOutputToken={selectedOutputToken}
                  disabled={loading || transactionStatus !== "notStarted"}
                />
              </div>
            )}
            {transactionStatus === "completed" && (
              <Button size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>

          {/* Destination chain settings */}
          <div className="flex flex-col flex-1 items-center justify-center">
            <ArcherElement
              id="center-element"
              relations={[
                {
                  targetId: "select-output-token",
                  targetAnchor: "top",
                  sourceAnchor: "bottom",
                },
              ]}
            >
              <Card className="rounded-2xl items-start w-64">
                <CardHeader>
                  <CardTitle>{"Output"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="items-center w-full space-y-2">
                    <Popover open={openNetwork} onOpenChange={setOpenNetwork}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openNetwork}
                          className="w-full justify-between"
                          disabled={
                            loading || transactionStatus !== "notStarted"
                          }
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
                    <p className="text-center">and</p>
                    <Popover
                      open={openOutputToken}
                      onOpenChange={setOpenOutputToken}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openNetwork}
                          className="w-full justify-between"
                          disabled={
                            loading ||
                            !selectedNetwork ||
                            transactionStatus !== "notStarted" ||
                            balancesPendingDestination
                          }
                        >
                          {selectedOutputToken?.name ||
                            (!selectedNetwork
                              ? "Select Network"
                              : balancesPendingDestination
                              ? "Loading..."
                              : "Select Output Token")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search tokens..." />
                          <CommandList>
                            <CommandEmpty>No token found.</CommandEmpty>
                            <CommandGroup>
                              {outputBalances.map((token) => (
                                <CommandItem
                                  key={token.name}
                                  // disabled={!network.enabled}
                                  onSelect={() =>
                                    handleSelectOutputToken(token)
                                  }
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedOutputToken === token
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {token.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            </ArcherElement>
          </div>
        </div>
      </ArcherContainer>
    </div>
  );
}
