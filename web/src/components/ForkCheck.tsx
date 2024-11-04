import { useChainId, useReadContract } from "wagmi";

const USDC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;

const usdcABI = [
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
];

const ForkCheck = () => {
  const chainId = useChainId(); // Get the connected chain ID

  // Fetch the USDC symbol from the forked network
  const {
    data: symbol,
    isError,
    isLoading,
  } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: usdcABI,
    functionName: "symbol",
  });

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Fork Check</h1>
      <p>Connected to Chain ID: {chainId}</p>

      {isLoading && <p>Loading USDC symbol...</p>}
      {isError && (
        <p>Error: Could not fetch data. Is your fork running correctly?</p>
      )}
      {symbol && (
        <p>
          USDC Symbol: <strong>{symbol}</strong>
        </p>
      )}
    </div>
  );
};

export default ForkCheck;
