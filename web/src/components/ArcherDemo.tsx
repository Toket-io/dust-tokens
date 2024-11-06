import React, { useEffect, useState } from "react";
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

const containerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: "600px",
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

const networks: Network[] = [
  {
    value: "ethereum",
    label: "Ethereum",
    enabled: true,
    rpc: "http://localhost:8545",
    contractAddress: "0x27F9aFE3B3fCb63ae1A6c662331698F2183809bF",
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
    contractAddress: "0x27F9aFE3B3fCb63ae1A6c662331698F2183809bF",
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

// Replace with your deployed contract's address and ABI
const CONTRACT_ADDRESS = "0x27F9aFE3B3fCb63ae1A6c662331698F2183809bF";
const CONTRACT_ABI = [
  "function getBalances(address user) view returns (address[], string[], string[], uint8[], uint256[])",
  "function addToken(address token) public",
  "function removeToken(address token) public",
  "function getTokens() view returns (address[], string[], string[], uint8[])",
  "function SwapAndBridgeTokens((address token, uint256 amount)[], address universalApp, bytes payload, (address revertAddress, bool callOnRevert, address abortAddress, bytes revertMessage, uint256 onRevertGasLimit) revertOptions) public",
  "function signatureBatchTransfer((address token, uint256 amount)[], uint256 nonce, uint256 deadline, bytes signature)",
  "event SwappedAndDeposited(address indexed executor, (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)[] swaps, uint256 totalTokensReceived)",
  "event SwappedAndWithdrawn(address indexed receiver, address outputToken, uint256 totalTokensReceived)",
];

const UNIVERSAL_APP_ADDRESS = "0xD516492bb58F07bc91c972DCCB2DF654653d4D33";

const ZETA_USDC_ETH_ADDRESS: string = ContractsConfig.zeta_usdcEthToken;

export default function Component() {
  const [balances, setBalances] = useState<Token[]>([]);
  const [outputBalances, setOutputBalances] = useState<Token[]>([]);
  const [selectedOutputToken, setSelectedOutputToken] = useState<Token | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [transactionPending, setTransactionPending] = useState(false);
  const [openToken, setOpenToken] = useState(false);
  const [openNetwork, setOpenNetwork] = useState(false);
  const [openOutputToken, setOpenOutputToken] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<SelectedToken[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<
    "source" | "zeta" | "destination" | null
  >(null);

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
    setTransactionPending(true);
    await handleSwapAndBridge();
  };

  const handleSelectToken = (token: Token) => {
    if (
      selectedTokens.length < 5 &&
      !selectedTokens.some((t) => t.symbol === token.symbol)
    ) {
      setSelectedTokens([
        ...selectedTokens,
        { ...token, amount: "", isMax: false },
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

  const handleAmountChange = (tokenValue: string, amount: string) => {
    // TODO: Check that amount is a valid number and within the token's balance
    setSelectedTokens(
      selectedTokens.map((token) =>
        token.symbol === tokenValue ? { ...token, amount, isMax: false } : token
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
    setTransactionStatus(null);
    fetchBalances();
  };

  const fetchBalances = async () => {
    try {
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
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
        CONTRACT_ADDRESS,
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

  // MARK: Helper Functions
  const encodeDestinationPayload = (
    recipient: string,
    outputToken: string
  ): string => {
    const destinationPayloadTypes = ["address", "address"];
    const destinationFunctionParams = ethers.utils.defaultAbiCoder.encode(
      destinationPayloadTypes,
      [outputToken, recipient]
    );

    const functionName = "ReceiveTokens(address,address)";
    const functionSignature = ethers.utils.id(functionName).slice(0, 10);
    const destinationPayload = ethers.utils.hexlify(
      ethers.utils.concat([functionSignature, destinationFunctionParams])
    );

    return destinationPayload;
  };

  const encodeZetachainPayload = (
    outputChainToken: string,
    destinationContract: string,
    destinationPayload: string
  ) => {
    const args = {
      types: ["address", "bytes", "bytes"],
      values: [outputChainToken, destinationContract, destinationPayload],
    };

    // Prepare encoded parameters for the call
    const valuesArray = args.values.map((value, index) => {
      const type = args.types[index];
      if (type === "bool") {
        try {
          return JSON.parse(value.toLowerCase());
        } catch (e) {
          throw new Error(`Invalid boolean value: ${value}`);
        }
      } else if (type.startsWith("uint") || type.startsWith("int")) {
        return ethers.BigNumber.from(value);
      } else {
        return value;
      }
    });

    const encodedParameters = ethers.utils.defaultAbiCoder.encode(
      args.types,
      valuesArray
    );

    return encodedParameters;
  };

  const signPermit = async (swaps) => {
    const nonce = Math.floor(Math.random() * 1e15); // 1 quadrillion potential nonces
    const deadline = calculateEndTime(30 * 60 * 1000); // 30 minute sig deadline

    // Create the permit object for batched transfers
    const permit = {
      deadline: deadline,
      nonce: nonce,
      permitted: swaps.map((s) => {
        return { amount: s.amount, token: s.token };
      }),
      spender: CONTRACT_ADDRESS,
    };

    console.log("permit object:", permit);

    // Get the chainId (Sepolia = 11155111)
    const network = await provider.getNetwork();
    const chainId = network.chainId;
    console.log("ChainID:", chainId);

    // Generate the permit return data & sign it
    const { domain, types, values } = SignatureTransfer.getPermitData(
      permit,
      PERMIT2_ADDRESS,
      chainId
    );
    const signature = await signer._signTypedData(domain, types, values);

    return { deadline, nonce, signature };
  };

  const signPermit2BatchApproval = async () => {
    const tokenSwaps = selectedTokens.map(({ amount, decimals, address }) => ({
      amount: ethers.utils.parseUnits(amount, decimals),
      token: address,
    }));

    const permit = await signPermit(tokenSwaps);

    const contractInstance = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );

    // Call our `signatureTransfer()` function with correct data and signature
    const tx = await contractInstance.signatureBatchTransfer(
      tokenSwaps,
      permit.nonce,
      permit.deadline,
      permit.signature
    );

    tx.wait();

    console.log("Signature Transfer TX:", tx.hash);
  };

  function calculateEndTime(duration: number) {
    return Math.floor((Date.now() + duration) / 1000);
  }

  const handleSwapAndBridge = async () => {
    try {
      setTransactionPending(true);

      // Validation checks
      if (
        !UNIVERSAL_APP_ADDRESS ||
        !ZETA_USDC_ETH_ADDRESS ||
        !signer ||
        !signer.address ||
        !signerAddress ||
        !selectedNetwork ||
        !selectedOutputToken
      ) {
        throw new Error(
          "Required parameters are missing or not properly initialized"
        );
      }

      // Step 1: Prepare payloads
      const destinationPayload = encodeDestinationPayload(
        signer.address,
        selectedOutputToken.address
      );
      const encodedParameters = encodeZetachainPayload(
        selectedNetwork.zrc20Address,
        selectedNetwork.contractAddress,
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

      // Create contract instance
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // Step 2: Perform swap and bridge transaction
      const tx = await contractInstance.SwapAndBridgeTokens(
        tokenSwaps,
        UNIVERSAL_APP_ADDRESS,
        encodedParameters,
        revertOptions
      );
      console.log("Transaction submitted:", tx.hash);

      setTransactionStatus("source");

      // Optional: Attach listener for SwappedAndDeposited if intermediate status updates are needed
      contractInstance.on(
        "SwappedAndDeposited",
        (executor, swaps, totalTokensReceived) => {
          if (executor.toLowerCase() === signer.address.toLowerCase()) {
            // Filter based on signer
            if (transactionStatus === "source") {
              setTransactionStatus("zeta");
            }

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
        CONTRACT_ADDRESS,
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
          setTransactionPending(false);
          setTransactionStatus("destination");
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
      setTransactionPending(false);
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
                <Card className="rounded-2xl mb-4 items-start w-64">
                  <CardHeader>
                    <div className="flex justify-between items-center w-full">
                      <CardTitle>{token.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveToken(token.symbol)}
                        disabled={
                          loading ||
                          transactionPending ||
                          transactionStatus === "destination"
                        }
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
                        disabled={transactionStatus === "destination"}
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
                        disabled={
                          loading ||
                          transactionPending ||
                          transactionStatus === "destination"
                        }
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
                              loading ||
                              transactionPending ||
                              transactionStatus === "destination"
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
                        disabled={
                          loading ||
                          transactionPending ||
                          transactionStatus === "destination"
                        }
                      >
                        Auto-select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ArcherElement>
          </div>

          {/* Root element in the center */}
          <div style={rootContainerStyle}>
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
                      transactionPending ? "animate-ping" : ""
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

                {transactionStatus && (
                  <div className="flex items-center justify-center mt-4">
                    <div className="flex items-center space-x-2">
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full",
                          ["source", "zeta", "destination"].includes(
                            transactionStatus
                          )
                            ? "bg-green-400"
                            : "bg-gray-300"
                        )}
                      ></div>
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full",
                          ["zeta", "destination"].includes(transactionStatus)
                            ? "bg-green-400"
                            : "bg-gray-300"
                        )}
                      ></div>
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full",
                          transactionStatus === "destination"
                            ? "bg-green-400"
                            : "bg-gray-300"
                        )}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </ArcherElement>
          </div>

          {/* Additional element to the right of the root */}
          <div style={columnStyle} className="space-y-16">
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
                            loading ||
                            transactionPending ||
                            transactionStatus === "destination"
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
                            transactionPending ||
                            !selectedNetwork ||
                            transactionStatus === "destination"
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
      <div className="flex items-center justify-center mt-4">
        {transactionStatus === "destination" ? (
          <Button size="lg" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        ) : (
          <SwapPreviewDrawer
            selectedTokens={selectedTokens}
            selectedNetwork={selectedNetwork}
            selectedOutputToken={selectedOutputToken}
            disabled={loading || transactionPending}
            onConfirm={handleSwapConfirm}
          />
        )}
      </div>
      <div>
        <Button onClick={signPermit2BatchApproval}>
          Test approve with Permit2
        </Button>
      </div>
    </div>
  );
}
