import { ethers } from "ethers";
import { useEffect, useState } from "react";

// Define the RPC URLs for other chains
const rpcUrls = {
  ethereum: "https://mainnet.infura.io/v3/YOUR_INFURA_API_KEY",
  polygon: "https://polygon-rpc.com",
  binance: "https://bsc-dataseed.binance.org/",
};

interface MultiChainBalanceProps {
  address: string; // Address to check the balance for
}

const MultiChainBalance = ({ address }: MultiChainBalanceProps) => {
  // State to hold balances from other chains
  const [multiChainBalances, setMultiChainBalances] = useState<any>({});

  useEffect(() => {
    if (!address) return;

    // Define the chains you want to check
    const chains = [
      { name: "Ethereum", rpcUrl: rpcUrls.ethereum },
      { name: "Polygon", rpcUrl: rpcUrls.polygon },
      { name: "Binance Smart Chain", rpcUrl: rpcUrls.binance },
    ];

    const fetchBalances = async () => {
      const balances = await Promise.all(
        chains.map(async (chain) => {
          const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);
          const balance = await provider.getBalance(address);
          return {
            chain: chain.name,
            balance: ethers.utils.formatEther(balance), // Format the balance
          };
        })
      );
      // Update state with the fetched balances
      const balancesMap = balances.reduce((acc, item) => {
        acc[item.chain] = item.balance;
        return acc;
      }, {});
      setMultiChainBalances(balancesMap);
    };

    // Fetch balances on other chains
    fetchBalances();
  }, [address]);

  return (
    <div>
      <h3>Multi-Chain Balances for Address: {address}</h3>
      {Object.entries(multiChainBalances).map(([chain, balance]) => (
        <p key={chain}>
          {chain}: {balance} ETH
        </p>
      ))}
    </div>
  );
};

export default MultiChainBalance;
