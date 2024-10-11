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
import { formatUnits, parseEther } from "viem"; // Using viem for formatting
import { abi as gatewayAbi } from "../abi/GatewayEVM.sol/GatewayEVM.json";
import { ethers } from "ethers";

const contract = "0xb459F14260D1dc6484CE56EB0826be317171e91F"; // universal swap contract

const zetaErc20Address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // ZETA
const usdcErc20Address = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82"; // USDC
const hardhatAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const evmGatewayAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

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
  const result = useBalance({
    address: account.address,
  });
  const { writeContract } = useWriteContract();
  const { data: hash, sendTransaction } = useSendTransaction();

  const handleDeposit = async () => {
    // Fetch token balance using viem
    console.log("Depositing USDC to ZetaChain: ", gatewayAbi);
    const receiver = account.address;
    const amount = 1;
    const assetAddress = usdcErc20Address;
    const revertOptions = {};

    await writeContract({
      abi: gatewayAbi,
      address: evmGatewayAddress,
      functionName: "deposit",
      args: [receiver, amount, assetAddress, revertOptions],
    });
  };

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
    erc20: string;
    gatewayEvm: string;
    receiver: string;
    revertOptions: revertOptions;
    txOptions: txOptions;
  }) {
    // Your private key (never share this in production)
    const privateKey =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    // Create a wallet instance from the private key
    const wallet = new ethers.Wallet(privateKey);
    const signer = wallet;
    const { utils } = ethers;
    const gateway = new ethers.Contract(args.gatewayEvm, gatewayAbi, signer);

    const revertOptions = {
      abortAddress: "0x0000000000000000000000000000000000000000", // not used
      callOnRevert: args.revertOptions.callOnRevert,
      onRevertGasLimit: args.revertOptions.onRevertGasLimit,
      revertAddress: args.revertOptions.revertAddress,
      // not used
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
      const erc20Contract = new ethers.Contract(args.erc20, erc20Abi, signer);
      const decimals = await erc20Contract.decimals();
      const value = utils.parseUnits(args.amount, decimals);
      await erc20Contract.connect(signer).approve(args.gatewayEvm, value);
      const method =
        "deposit(address,uint256,address,(address,bool,address,bytes,uint256))";
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
      tx = await gateway[method](args.receiver, revertOptions, {
        ...txOptions,
        value,
      });
    }

    return tx;
  };

  const handleTransfer = async () => {
    // const value: string = "0.1";
    // const to = "0x5E11ECE805cbc4C95161399A90D7A5c207E150b6";
    // sendTransaction({ to, value: parseEther(value) });

    const revertOptions: revertOptions = {
      revertAddress: "0x0000000000000000000000000000000000000000",
      callOnRevert: false,
      onRevertGasLimit: 7000000,
      revertMessage: "0x",
    };

    evmDeposit({
      amount: "1",
      erc20: usdcErc20Address,
      gatewayEvm: evmGatewayAddress,
      receiver: "0x5E11ECE805cbc4C95161399A90D7A5c207E150b6",
      revertOptions: revertOptions,
      txOptions: {
        gasLimit: 1000000,
        gasPrice: ethers.BigNumber.from("1000000000"),
      },
    });
  };

  return (
    <div className="m-4">
      <div className="flex justify-end gap-2 mb-10">
        <ConnectBitcoin />
        <ConnectButton label="Connect EVM" showBalance={true} />
      </div>
      {/* <Welcome /> */}
      <div className="flex justify-center">
        <div className="w-[400px]">
          <Erc20Balance contractAddress={usdcErc20Address} />
          <Erc20Balance contractAddress={zetaErc20Address} />

          <button
            onClick={handleTransfer}
            className="p-2 mt-8 border-2 rounded-md"
          >
            Deposit USDC to ZetaChain
          </button>
          {/* <Profile address={account.address} />
          <Swap contract={contract} />
          <Balances /> */}
        </div>
      </div>
    </div>
  );
};

export function Erc20Balance({
  contractAddress,
}: {
  contractAddress: `0x${string}`;
}) {
  // Fetch token balance using viem
  const {
    data: tokenBalance,
    isError,
    isLoading,
  } = useReadContract({
    address: contractAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [hardhatAccount], // Passing the user's wallet address
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

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching balance</div>;

  // Format the balance using viem's formatUnits
  const formattedBalance = tokenBalance
    ? formatUnits(tokenBalance as bigint, (decimals as number) || 18)
    : "0";

  return (
    <div>
      {name as string}: {formattedBalance}
    </div>
  );
}

export default Page;
