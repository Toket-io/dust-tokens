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

const hardhatAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const evmDustTokenAddress = "0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00";
const EvmDustTokensAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "systemContractAddress",
        type: "address",
      },
      {
        internalType: "address payable",
        name: "gatewayAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "gateway",
    outputs: [
      {
        internalType: "contract GatewayEVM",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "recipient",
        type: "bytes",
      },
    ],
    name: "swapAndDeposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
    ],
    name: "swapAndDeposit2",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "systemContract",
    outputs: [
      {
        internalType: "contract SystemContract",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
    ],
    name: "testTransfer",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

interface ChainAddresses {
  gateway: `0x${string}`;
  tss?: `0x${string}`;
  erc20custody?: `0x${string}`;
  fungibleModule?: `0x${string}`;
  systemContract?: `0x${string}`;
  usdc: `0x${string}`;
  zeta: `0x${string}`;
  eth?: `0x${string}`;
}

const evmAddresses: ChainAddresses = {
  gateway: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  tss: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  erc20custody: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  usdc: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
  zeta: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
};

const zetaAddresses: ChainAddresses = {
  gateway: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
  fungibleModule: "0x735b14BB79463307AAcBED86DAf3322B1e6226aB",
  systemContract: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  usdc: "0x9fd96203f7b22bCF72d9DCb40ff98302376cE09c",
  zeta: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  eth: "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe",
};

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
    // Get the MetaMask provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Request MetaMask to connect and get the signer (current connected account)
    await provider.send("eth_requestAccounts", []); // Request connection
    const signer = provider.getSigner(); // Get the signer from MetaMask

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
    // Get MetaMask provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Request MetaMask account access and get signer
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

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

  const evmSwapAndDeposit = async function () {
    const args = {
      amount: "1.5",
      erc20: null,
      receiver: hardhatAccount,
      txOptions: {
        gasLimit: 10000000,
        gasPrice: ethers.BigNumber.from("1000000000"),
      },
    };

    // Get the MetaMask provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Request MetaMask to connect and get the signer (current connected account)
    await provider.send("eth_requestAccounts", []); // Request connection
    const signer = provider.getSigner(); // Get the signer from MetaMask

    const { utils } = ethers;
    const dustTokens = new ethers.Contract(
      evmDustTokenAddress,
      EvmDustTokensAbi,
      signer
    );

    const txOptions = {
      gasLimit: args.txOptions.gasLimit,
      gasPrice: args.txOptions.gasPrice,
    };

    let tx;
    if (args.erc20) {
      // const erc20Contract = new ethers.Contract(args.erc20, zerc20Abi, signer);
      // const decimals = await erc20Contract.decimals();
      // const value = utils.parseUnits(args.amount, decimals);
      // // Approve the gateway to spend the tokens
      // await erc20Contract.connect(signer).approve(args.gatewayEvm, value);
      // const method =
      //   "deposit(address,uint256,address,(address,bool,address,bytes,uint256))";
      // // Call the deposit method on the gateway contract
      // tx = await gateway[method](args.receiver, value, args.erc20, txOptions);
    } else {
      const value = utils.parseEther(args.amount);
      const method = "swapAndDeposit(bytes)";

      // Call the deposit method for ETH on the gateway contract
      tx = await dustTokens[method](args.receiver, {
        ...txOptions,
        value,
      });
    }

    return tx;
  };

  const handleDepositETH = async () => {
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
      receiver: hardhatAccount,
      revertOptions: revertOptions,
      txOptions: {
        gasLimit: 1000000,
        gasPrice: ethers.BigNumber.from("1000000000"),
      },
    });
  };

  const handleDepositUSDC = async () => {
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
      receiver: hardhatAccount,
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

    const universalAppAddress = "0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9";

    evmDepositAndCall({
      amount: "100",
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
      <div className="flex justify-center items-center">
        <div className="flex flex-row space-x-6">
          <div className="border-2 p-4 rounded-xl">
            <h1 className="text-4xl font-bold">EVM</h1>
            <h1 className="text-3xl font-bold mt-6">Signer Balances</h1>
            <Erc20Balance account={hardhatAccount} />
            <Erc20Balance
              contractAddress={evmAddresses.usdc}
              account={hardhatAccount}
            />
            <Erc20Balance
              contractAddress={evmAddresses.zeta}
              account={hardhatAccount}
            />
            <h1 className="text-3xl font-bold mt-6">Gateway Balances</h1>
            <Erc20Balance account={evmAddresses.gateway} />
            <Erc20Balance
              contractAddress={evmAddresses.usdc}
              account={evmAddresses.gateway}
            />
            <Erc20Balance
              contractAddress={evmAddresses.zeta}
              account={evmAddresses.gateway}
            />
            <h1 className="text-3xl font-bold mt-6">TSS Balances</h1>
            <Erc20Balance account={evmAddresses.tss!} />
            <Erc20Balance
              contractAddress={evmAddresses.usdc}
              account={evmAddresses.tss!}
            />
            <Erc20Balance
              contractAddress={evmAddresses.zeta}
              account={evmAddresses.tss!}
            />
            <h1 className="text-3xl font-bold mt-6">Custody Balances</h1>
            <Erc20Balance account={evmAddresses.erc20custody!} />
            <Erc20Balance
              contractAddress={evmAddresses.usdc}
              account={evmAddresses.erc20custody!}
            />
            <Erc20Balance
              contractAddress={evmAddresses.zeta}
              account={evmAddresses.erc20custody!}
            />
          </div>
          <div className="border-2 p-4 rounded-xl">
            <h1 className="text-4xl font-bold">ZetaChain</h1>
            <h1 className="text-3xl font-bold mt-6">Signer Balances</h1>
            <Erc20Balance
              contractAddress={zetaAddresses.usdc}
              account={hardhatAccount}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.eth!}
              account={hardhatAccount}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.zeta}
              account={hardhatAccount}
            />
            <h1 className="text-3xl font-bold mt-6">Gateway Balances</h1>
            <Erc20Balance
              contractAddress={zetaAddresses.usdc}
              account={zetaAddresses.gateway}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.eth!}
              account={zetaAddresses.gateway}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.zeta}
              account={zetaAddresses.gateway}
            />
            <h1 className="text-3xl font-bold mt-6">Fungible Module</h1>
            <Erc20Balance
              contractAddress={zetaAddresses.usdc}
              account={zetaAddresses.fungibleModule!}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.eth!}
              account={zetaAddresses.fungibleModule!}
            />
            <Erc20Balance
              contractAddress={zetaAddresses.zeta}
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
            <Erc20Balance
              contractAddress={zetaAddresses.zeta}
              account={zetaAddresses.systemContract!}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <h1 className="text-4xl font-bold mt-6">Actions</h1>
        <button
          onClick={handleDepositETH}
          className="p-2 mt-6 border-2 rounded-md"
        >
          Deposit ETH to ZetaChain
        </button>
        <button
          onClick={handleDepositUSDC}
          className="p-2 mt-6 border-2 rounded-md"
        >
          Deposit USDC to ZetaChain
        </button>
        <button
          onClick={handleSwapFromEth}
          className="p-2 mt-6 border-2 rounded-md"
        >
          Swap ETH to USDC
          <p className="text-xs">Deposit and Call</p>
        </button>
        <button
          onClick={evmSwapAndDeposit}
          className="p-2 mt-6 border-2 rounded-md"
        >
          [DUST] Swap ETH to USDC
          <p className="text-xs">Deposit and Call</p>
        </button>
      </div>
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
    async function fetchNativeBalance() {
      try {
        setIsNativeBalanceLoading(true);
        const provider = new ethers.providers.Web3Provider(window.ethereum); // Use MetaMask provider or a specified one
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
    enabled: !!contractAddress, // Only fetch token balance if contract address is provided
  });

  // Fetch token decimals using viem
  const { data: decimals } = useReadContract({
    address: contractAddress,
    abi: erc20Abi,
    functionName: "decimals",
    enabled: !!contractAddress, // Only fetch decimals if contract address is provided
  });

  // Fetch ERC20 name
  const { data: name } = useReadContract({
    address: contractAddress,
    abi: erc20Abi,
    functionName: "name",
    enabled: !!contractAddress, // Only fetch name if contract address is provided
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
