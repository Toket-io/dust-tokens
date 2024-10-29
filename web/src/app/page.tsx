"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Swap,
  Profile,
  ConnectBitcoin,
  Balances,
  walletClientToSigner,
  UniversalKitProvider,
} from "@zetachain/universalkit";
import { Welcome } from "./welcome";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useSendTransaction,
} from "wagmi";
import { getBalance } from "@wagmi/core";
import { config } from "../wagmi";
import { formatUnits, parseEther } from "viem"; // Using viem for formatting
import { abi as gatewayAbi } from "../abi/GatewayEVM.sol/GatewayEVM.json";
import { abi as zerc20Abi } from "../abi/ZRC20.sol/ZRC20.json";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import DustTokensActions from "../components/DustTokensActions";
import ForkCheck from "../components/ForkCheck";
import TokenSwapSelector from "@/components/TokenSwapSelector";
import { evmAddresses, zetaAddresses } from "@/zetachain";
import { Button } from "@/components/ui/button";
import ContractsConfig from "../../../ContractsConfig";

const universalAppAddress = ContractsConfig.zeta_universalDapp;
const hardhatAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const localhostProvider = new ethers.providers.JsonRpcProvider(
  "http://localhost:8545"
);

// Provide your private key (keep it secure!)
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Create a wallet with the private key connected to the provider
export const signer = new ethers.Wallet(PRIVATE_KEY, localhostProvider);

// // Get the MetaMask provider
// const provider = new ethers.providers.Web3Provider(window.ethereum);

// // Request MetaMask to connect and get the signer (current connected account)
// await provider.send("eth_requestAccounts", []); // Request connection
// const signer = provider.getSigner(); // Get the signer from MetaMask

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

const Page = () => {
  const account = useAccount();

  const balance = getBalance(config, {
    address: account.address!,
  });

  type revertOptions = {
    callOnRevert: boolean;
    onRevertGasLimit: number;
    revertAddress: string;
    revertMessage: string;
  };

  type txOptions = {
    gasLimit: number;
    gasPrice: ethers.BigNumber;
  };

  const evmDeposit = async function (args: {
    amount: string;
    erc20: string | null;
    gatewayEvm: string;
    receiver: string;
    revertOptions: revertOptions;
    txOptions: txOptions;
  }) {
    const { utils } = ethers;
    const gateway = new ethers.Contract(args.gatewayEvm, gatewayAbi, signer);

    const revertOptions = {
      abortAddress: "0x0000000000000000000000000000000000000000", // not used
      callOnRevert: args.revertOptions.callOnRevert,
      onRevertGasLimit: args.revertOptions.onRevertGasLimit,
      revertAddress: args.revertOptions.revertAddress,
      revertMessage: utils.hexlify(
        utils.toUtf8Bytes(args.revertOptions.revertMessage)
      ),
    };

    const txOptions = {
      gasLimit: args.txOptions.gasLimit,
      gasPrice: args.txOptions.gasPrice,
    };

    let tx;
    if (args.erc20) {
      const erc20Contract = new ethers.Contract(args.erc20, zerc20Abi, signer);
      const decimals = await erc20Contract.decimals();
      const value = utils.parseUnits(args.amount, decimals);

      // Approve the gateway to spend the tokens
      await erc20Contract.connect(signer).approve(args.gatewayEvm, value);

      const method =
        "deposit(address,uint256,address,(address,bool,address,bytes,uint256))";

      // Call the deposit method on the gateway contract
      tx = await gateway[method](
        args.receiver,
        value,
        args.erc20,
        revertOptions,
        txOptions
      );
    } else {
      const value = utils.parseEther(args.amount);
      const method = "deposit(address,(address,bool,address,bytes,uint256))";

      // Call the deposit method for ETH on the gateway contract
      tx = await gateway[method](args.receiver, revertOptions, {
        ...txOptions,
        value,
      });
    }

    return tx;
  };

  const evmDepositAndCall = async function (args: {
    amount: string;
    erc20: string | null;
    gatewayEvm: string;
    receiver: string;
    revertOptions: revertOptions;
    txOptions: txOptions;
    types: string[];
    values: any[];
  }) {
    const { utils } = ethers;
    const gateway = new ethers.Contract(args.gatewayEvm, gatewayAbi, signer);

    const revertOptions = {
      abortAddress: "0x0000000000000000000000000000000000000000", // not used
      callOnRevert: args.revertOptions.callOnRevert,
      onRevertGasLimit: args.revertOptions.onRevertGasLimit,
      revertAddress: args.revertOptions.revertAddress,
      revertMessage: utils.hexlify(
        utils.toUtf8Bytes(args.revertOptions.revertMessage)
      ),
    };

    const txOptions = {
      gasLimit: args.txOptions.gasLimit,
      gasPrice: args.txOptions.gasPrice,
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

    const encodedParameters = utils.defaultAbiCoder.encode(
      args.types,
      valuesArray
    );

    let tx;
    if (args.erc20) {
      // If ERC20 is specified, approve and call depositAndCall
      const erc20Contract = new ethers.Contract(args.erc20, zerc20Abi, signer);
      const decimals = await erc20Contract.decimals();
      const value = utils.parseUnits(args.amount, decimals);

      // Approve the gateway to spend tokens
      await erc20Contract.connect(signer).approve(args.gatewayEvm, value);

      const method =
        "depositAndCall(address,uint256,address,bytes,(address,bool,address,bytes,uint256))";
      tx = await gateway[method](
        args.receiver,
        value,
        args.erc20,
        encodedParameters,
        revertOptions,
        txOptions
      );
    } else {
      // If no ERC20, it's a native token transfer
      const value = utils.parseEther(args.amount);
      const method =
        "depositAndCall(address,bytes,(address,bool,address,bytes,uint256))";
      tx = await gateway[method](
        args.receiver,
        encodedParameters,
        revertOptions,
        {
          ...txOptions,
          value,
        }
      );
    }

    return tx;
  };

  const handleDepositETH = async (receiver: string) => {
    const revertOptions: revertOptions = {
      revertAddress: "0x0000000000000000000000000000000000000000",
      callOnRevert: false,
      onRevertGasLimit: 7000000,
      revertMessage: "0x",
    };

    evmDeposit({
      amount: "1",
      erc20: null,
      gatewayEvm: evmAddresses.gateway,
      receiver: receiver,
      revertOptions: revertOptions,
      txOptions: {
        gasLimit: 1000000,
        gasPrice: ethers.BigNumber.from("1000000000"),
      },
    });
  };

  const handleDepositUSDC = async (receiver: string) => {
    const revertOptions: revertOptions = {
      revertAddress: "0x0000000000000000000000000000000000000000",
      callOnRevert: false,
      onRevertGasLimit: 7000000,
      revertMessage: "0x",
    };

    evmDeposit({
      amount: "1",
      erc20: evmAddresses.usdc,
      gatewayEvm: evmAddresses.gateway,
      receiver: receiver,
      revertOptions: revertOptions,
      txOptions: {
        gasLimit: 1000000,
        gasPrice: ethers.BigNumber.from("1000000000"),
      },
    });
  };

  const handleSwapFromEth = async () => {
    const revertOptions: revertOptions = {
      revertAddress: "0x0000000000000000000000000000000000000000",
      callOnRevert: false,
      onRevertGasLimit: 7000000,
      revertMessage: "0x",
    };

    evmDepositAndCall({
      amount: "10",
      erc20: null,
      gatewayEvm: evmAddresses.gateway,
      receiver: universalAppAddress,
      revertOptions: revertOptions,
      txOptions: {
        gasLimit: 1000000,
        gasPrice: ethers.BigNumber.from("1000000000"),
      },
      types: ["address", "bytes"],
      values: [zetaAddresses.usdc, hardhatAccount],
    });
  };

  return (
    <div className="m-4">
      <div className="flex justify-end gap-2 mb-10">
        <ConnectBitcoin />
        <ConnectButton label="Connect EVM" showBalance={true} />
      </div>
      {/* <Welcome /> */}
      <div className="bg-white p-8">
        <TokenSwapSelector />
      </div>
      <div className="flex justify-center items-center">
        <div className="flex flex-row space-x-6">
          <div className="border-2 p-4 rounded-xl">
            <h1 className="text-4xl font-bold">EVM</h1>
            <h1 className="text-3xl font-bold mt-6">Signer</h1>
            <Erc20Balance account={hardhatAccount} />
            <Erc20Balance
              contractAddress={evmAddresses.usdc}
              account={hardhatAccount}
            />

            <h1 className="text-3xl font-bold mt-6">Gateway</h1>
            <Erc20Balance account={evmAddresses.gateway} />
            <Erc20Balance
              contractAddress={evmAddresses.usdc}
              account={evmAddresses.gateway}
            />
            <div className="mt-2">
              <Button
                size="sm"
                className="mr-2"
                onClick={() => handleDepositETH(hardhatAccount)}
              >
                Deposit 1 ETH
              </Button>
              <Button
                size="sm"
                onClick={() => handleDepositUSDC(hardhatAccount)}
              >
                Deposit 1 USDC
              </Button>
            </div>
            <h1 className="text-3xl font-bold mt-6">Dust Tokens</h1>
            <Erc20Balance account={ContractsConfig.evmDapp} />
            <Erc20Balance
              contractAddress={ContractsConfig.evm_usdcToken}
              account={ContractsConfig.evmDapp}
            />

            <h1 className="text-3xl font-bold mt-6">TSS</h1>
            <Erc20Balance account={evmAddresses.tss!} />
            <Erc20Balance
              contractAddress={evmAddresses.usdc}
              account={evmAddresses.tss!}
            />

            <h1 className="text-3xl font-bold mt-6">ERC20 Custody</h1>
            <Erc20Balance account={evmAddresses.erc20custody!} />
            <Erc20Balance
              contractAddress={evmAddresses.usdc}
              account={evmAddresses.erc20custody!}
            />
          </div>
          <div className="border-2 p-4 rounded-xl">
            <h1 className="text-4xl font-bold">ZetaChain</h1>
            <h1 className="text-3xl font-bold mt-6">Signer</h1>
            <Erc20Balance
              contractAddress={zetaAddresses.eth!}
              account={hardhatAccount}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.usdc}
              account={hardhatAccount}
            />

            <h1 className="text-3xl font-bold mt-6">Gateway</h1>
            <Erc20Balance
              contractAddress={zetaAddresses.usdc}
              account={zetaAddresses.gateway}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.eth!}
              account={zetaAddresses.gateway}
            />

            <h1 className="text-3xl font-bold mt-6">My Universal App</h1>
            <Erc20Balance
              contractAddress={zetaAddresses.eth!}
              account={universalAppAddress}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.usdc}
              account={universalAppAddress}
            />
            <div className="mt-2">
              {/* <Button size="sm" className="mr-2" onClick={handleSwapFromEth}>
                Swap 10 ETH to USDC
              </Button> */}
              <Button
                size="sm"
                className="mr-2"
                onClick={() =>
                  handleDepositETH(ContractsConfig.zeta_universalDapp)
                }
              >
                Deposit 1 ETH
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  handleDepositUSDC(ContractsConfig.zeta_universalDapp)
                }
              >
                Deposit 1 USDC
              </Button>
            </div>

            <h1 className="text-3xl font-bold mt-6">Fungible Module</h1>
            <Erc20Balance
              contractAddress={zetaAddresses.usdc}
              account={zetaAddresses.fungibleModule!}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.eth!}
              account={zetaAddresses.fungibleModule!}
            />

            <h1 className="text-3xl font-bold mt-6">System Contract</h1>
            <Erc20Balance
              contractAddress={zetaAddresses.usdc}
              account={zetaAddresses.systemContract!}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.eth!}
              account={zetaAddresses.systemContract!}
            />
          </div>
        </div>
      </div>
      <DustTokensActions />
      <ForkCheck />
    </div>
  );
};

function Erc20Balance({
  contractAddress,
  account,
}: {
  contractAddress?: `0x${string}`; // Optional contract address for ERC20
  account: `0x${string}`;
}) {
  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  const [isNativeBalanceLoading, setIsNativeBalanceLoading] = useState(true);
  const [isNativeBalanceError, setIsNativeBalanceError] = useState(false);

  // Fetch the native token balance using ethers.js
  useEffect(() => {
    console.log("Fetching balance for", contractAddress);
    async function fetchNativeBalance() {
      try {
        setIsNativeBalanceLoading(true);

        // Create a JSON rpc provider pointing to localhost
        const provider = localhostProvider; // Use MetaMask provider or a specified one
        const balance = await provider.getBalance(account); // Fetch the balance
        const formattedBalance = formatUnits(balance, 18); // Format to readable Ether/MATIC/etc.
        setNativeBalance(Number(formattedBalance).toFixed(2)); // Limit to 2 decimal places
        setIsNativeBalanceLoading(false);
      } catch (error) {
        console.error("Error fetching native balance:", error);
        setNativeBalance(null);
        setIsNativeBalanceError(true);
        setIsNativeBalanceLoading(false);
      }
    }

    if (!contractAddress) {
      fetchNativeBalance(); // Only fetch native balance if no ERC20 contract is provided
    }
  }, [account, contractAddress]);

  // Fetch token balance using viem if contractAddress is provided
  const {
    data: tokenBalance,
    isError: isTokenBalanceError,
    isLoading: isTokenBalanceLoading,
  } = useReadContract({
    address: contractAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account], // Passing the user's wallet address
  });

  // Fetch token decimals using viem
  const { data: decimals } = useReadContract({
    address: contractAddress,
    abi: erc20Abi,
    functionName: "decimals",
  });

  // Fetch ERC20 name
  const { data: name } = useReadContract({
    address: contractAddress,
    abi: erc20Abi,
    functionName: "name",
  });

  if (contractAddress) {
    if (isTokenBalanceLoading) return <div>Loading token balance...</div>;
    if (isTokenBalanceError) return <div>Error fetching token balance</div>;

    // Format the balance using ethers.js' formatUnits and limit to 2 decimals
    const formattedTokenBalance = tokenBalance
      ? Number(
          formatUnits(tokenBalance as bigint, (decimals as number) || 18)
        ).toFixed(2)
      : "0.00";

    return (
      <div>
        {name as string}: {formattedTokenBalance}
      </div>
    );
  } else {
    if (isNativeBalanceLoading) return <div>Loading native balance...</div>;
    if (isNativeBalanceError) return <div>Error fetching native balance</div>;

    return <div>ETH: {nativeBalance}</div>;
  }
}

export default Page;
