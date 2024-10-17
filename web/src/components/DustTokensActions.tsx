import React from "react";
import { ethers } from "ethers";
import { formatUnits, parseEther } from "viem"; // Using viem for formatting

export default function DustTokensActions() {
  const hardhatAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

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

  return (
    <div>
      <h1 className="text-4xl font-bold mt-6">Dust Tokens Dapp</h1>

      <button
        onClick={evmSwapAndDeposit}
        className="p-2 mt-6 border-2 rounded-md"
      >
        [DUST] Swap ETH to USDC
        <p className="text-xs">Deposit and Call</p>
      </button>
    </div>
  );
}

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
