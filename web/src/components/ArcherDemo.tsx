import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, ChevronsUpDown, Coins, RotateCcw, X } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SwapPreviewDrawer } from "./SwapPreviewDrawer";
import { ethers } from "ethers";
import { provider, signer } from "@/app/page";
import ContractsConfig from "../../../ContractsConfig";
import { toast } from "sonner";
import { SignatureTransfer, PERMIT2_ADDRESS } from "@uniswap/Permit2-sdk";
import TransactionStatus from "./TransactionStatus";
import {
  encodeDestinationPayload,
  encodeZetachainPayload,
  preparePermitData,
} from "@/lib/zetachainUtils";

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  address: string;
}

export type SelectedToken = Token & {
  amount: string;
  isMax: boolean;
  hasPermit2Allowance: boolean;
};

export type Network = {
  value: string;
  label: string;
  enabled: boolean;
  rpc: string;
  contractAddress: string;
  zrc20Address: string;
  nativeToken: Token;
};

export type TransactionState =
  | "notStarted"
  | "sourcePending"
  | "zetaPending"
  | "destinationPending"
  | "completed";

const networks: Network[] = [
  {
    value: "ethereum",
    label: "Ethereum",
    enabled: true,
    rpc: "http://localhost:8545",
    contractAddress: ContractsConfig.evmDapp,
    zrc20Address: ContractsConfig.zeta_ethEthToken,
    nativeToken: {
      name: "Ether (Native)",
      symbol: "ETH",
      decimals: 18,
      balance: 0,
      address: "0x0000000000000000000000000000000000000000",
    },
  },
  {
    value: "binance",
    label: "Binance Smart Chain",
    enabled: false,
    rpc: "",
    contractAddress: ContractsConfig.evmDapp,
    zrc20Address: ContractsConfig.zeta_ethEthToken,
    nativeToken: {
      name: "Ether (Native)",
      symbol: "ETH",
      decimals: 18,
      balance: 0,
      address: "0x0000000000000000000000000000000000000000",
    },
  },
];

const CONTRACT_ABI = [
  "function getBalances(address user) view returns (address[], string[], string[], uint8[], uint256[])",
  "function hasPermit2Allowance(address user, address token, uint256 requiredAmount) view returns (bool)",
  "function getTokens() view returns (address[], string[], string[], uint8[])",
  "function SwapAndBridgeTokens((address token, uint256 amount)[], address universalApp, bytes payload, (address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions, uint256 nonce, uint256 deadline, bytes signature) public",
  "function signatureBatchTransfer((address token, uint256 amount)[], uint256 nonce, uint256 deadline, bytes signature)",
  "event SwappedAndDeposited(address indexed executor, (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)[] swaps, uint256 totalTokensReceived)",
  "event SwappedAndWithdrawn(address indexed receiver, address outputToken, uint256 totalTokensReceived)",
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

  useEffect(() => {
    const initializeProvider = async () => {
      fetchBalances();
    };

    initializeProvider();
  }, []);

  useEffect(() => {
    if (selectedNetwork) {
      fetchOutputBalances();
    } else {
      setOutputBalances([]);
    }
  }, [selectedNetwork]);

  const handleSwapConfirm = async () => {
    await handleSwapAndBridge();
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

  const handleApprovePermit2 = async (token: Token) => {
    const ercAbi = [
      "function approve(address spender, uint256 amount) returns (bool)",
    ];

    const tokenContract = new ethers.Contract(token.address, ercAbi, signer);
    const tx = await tokenContract.approve(
      PERMIT2_ADDRESS,
      ethers.constants.MaxUint256
    );
    await tx.wait();

    console.log("Approved token");
  };

  const handleAmountChange = async (tokenValue: string, amount: string) => {
    // TODO: Check that amount is a valid number and within the token's balance

    const contractInstance = new ethers.Contract(
      ContractsConfig.evmDapp,
      CONTRACT_ABI,
      signer
    );

    const selectedToken = selectedTokens.find(
      (token) => token.symbol === tokenValue
    );

    let hasPermit2Allowance = true;
    if (selectedToken && amount !== "") {
      console.log("CHECKING PERMIT2 ALLOWANCE: ", selectedToken);
      await contractInstance.hasPermit2Allowance(
        signer.address,
        selectedToken.address,
        ethers.utils.parseUnits(amount, selectedToken.decimals)
      );
    }

    setSelectedTokens(
      selectedTokens.map((token) =>
        token.symbol === tokenValue
          ? {
              ...token,
              amount,
              isMax: false,
              hasPermit2Allowance,
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
    fetchBalances();
  };

  const fetchBalances = async () => {
    try {
      const contractInstance = new ethers.Contract(
        ContractsConfig.evmDapp,
        CONTRACT_ABI,
        signer
      );

      setLoading(true);
      const [addresses, names, symbols, decimals, tokenBalances] =
        await contractInstance.getBalances(signer.address);
      const formattedBalances: Token[] = addresses.map((address, index) => ({
        address,
        name: names[index],
        symbol: symbols[index],
        decimals: decimals[index],
        balance: Number(
          ethers.utils.formatUnits(tokenBalances[index], decimals[index])
        ),
      }));
      setBalances(formattedBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutputBalances = async () => {
    try {
      setLoading(true);

      console.log("Selected network:", selectedNetwork);

      const localhostProvider = new ethers.providers.JsonRpcProvider(
        selectedNetwork!.rpc
      );

      // Create a read-only contract instance by passing only the provider
      const contractInstance = new ethers.Contract(
        ContractsConfig.evmDapp,
        CONTRACT_ABI,
        localhostProvider
      );

      const [addresses, names, symbols, decimals, tokenBalances] =
        await contractInstance.getBalances(signer.address);
      const formattedBalances: Token[] = addresses.map((address, index) => ({
        address,
        name: names[index],
        symbol: symbols[index],
        decimals: decimals[index],
        balance: Number(
          ethers.utils.formatUnits(tokenBalances[index], decimals[index])
        ),
      }));

      console.log("Output balances:", formattedBalances);

      // Add native token to the list of output balances
      formattedBalances.push(selectedNetwork.nativeToken);

      setOutputBalances(formattedBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const signPermit = async (swaps: TokenSwap[]) => {
    const { domain, types, values, deadline, nonce } = await preparePermitData(
      provider,
      swaps,
      ContractsConfig.evmDapp
    );
    const signature = await signer._signTypedData(domain, types, values);

    return { deadline, nonce, signature };
  };

  const handleSwapAndBridge = async () => {
    try {
      // Validation checks
      if (
        !ContractsConfig.zeta_universalDapp ||
        !signer ||
        !signer.address ||
        !selectedNetwork ||
        !selectedOutputToken
      ) {
        throw new Error(
          "Required parameters are missing or not properly initialized"
        );
      }

      // Step 1: Prepare payloads
      const recipient = signer.address;
      const outputToken = selectedOutputToken.address;
      const destinationPayload = encodeDestinationPayload(
        recipient,
        outputToken
      );
      const encodedParameters = encodeZetachainPayload(
        selectedNetwork.zrc20Address,
        selectedNetwork.contractAddress,
        recipient,
        outputToken,
        destinationPayload
      );
      const revertOptions = {
        abortAddress: "0x0000000000000000000000000000000000000000",
        callOnRevert: false,
        onRevertGasLimit: 7000000,
        revertAddress: "0x0000000000000000000000000000000000000000",
        revertMessage: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("0x")),
      };
      const tokenSwaps = selectedTokens.map(
        ({ amount, decimals, address }) => ({
          amount: ethers.utils.parseUnits(amount, decimals),
          token: address,
        })
      );

      const permit = await signPermit(tokenSwaps);

      // Create contract instance
      const contractInstance = new ethers.Contract(
        ContractsConfig.evmDapp,
        CONTRACT_ABI,
        signer
      );

      setTransactionStatus("sourcePending");

      // Step 2: Perform swap and bridge transaction
      const tx = await contractInstance.SwapAndBridgeTokens(
        tokenSwaps,
        ContractsConfig.zeta_universalDapp,
        encodedParameters,
        revertOptions,
        permit.nonce,
        permit.deadline,
        permit.signature
      );

      const receipt = tx.wait();

      console.log("Transaction submitted:", tx.hash, receipt);

      setTransactionStatus("zetaPending");

      // Optional: Attach listener for SwappedAndDeposited if intermediate status updates are needed
      contractInstance.on(
        "SwappedAndDeposited",
        (executor, swaps, totalTokensReceived) => {
          if (executor.toLowerCase() === signer.address.toLowerCase()) {
            // Filter based on signer

            setTransactionStatus("destinationPending");

            console.log("SwappedAndDeposited event detected for signer!");
            const totalEther = ethers.utils.formatEther(totalTokensReceived);
            console.log("Total Tokens Received:", totalEther);
          }
        }
      );

      // Step 3: Listen for the final 'SwappedAndWithdrawn' event to mark success
      const localhostProvider = new ethers.providers.JsonRpcProvider(
        selectedNetwork.rpc
      );
      const readOnlyContractInstance = new ethers.Contract(
        ContractsConfig.evmDapp,
        CONTRACT_ABI,
        localhostProvider
      );

      const onSwappedAndWithdrawn = (executor, outputToken, outputAmount) => {
        if (executor.toLowerCase() === signer.address.toLowerCase()) {
          // Filter based on signer
          console.log("SwappedAndWithdrawn event detected for signer!");
          const formattedAmount = ethers.utils.formatUnits(
            outputAmount,
            selectedOutputToken.decimals
          );

          // Mark transaction as complete and show success
          setTransactionStatus("completed");
          toast.success(
            "Your tokens have been successfully swapped and bridged!",
            {
              description: `You have received: ${formattedAmount} ${selectedOutputToken.symbol}`,
              position: "top-center",
              duration: 8000,
            }
          );

          // Remove the event listener to avoid memory leaks
          readOnlyContractInstance.off(
            "SwappedAndWithdrawn",
            onSwappedAndWithdrawn
          );
        }
      };

      // Attach the event listener for the final completion
      readOnlyContractInstance.on("SwappedAndWithdrawn", onSwappedAndWithdrawn);
    } catch (error) {
      console.error("Swap and bridge failed:", error);
    }
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
                              loading || transactionStatus !== "notStarted"
                            }
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
                  onConfirm={handleSwapConfirm}
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
                            transactionStatus !== "notStarted"
                          }
                        >
                          {selectedOutputToken?.name || "Select Output Token"}
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
