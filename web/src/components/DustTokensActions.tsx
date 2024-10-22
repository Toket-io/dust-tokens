import React from "react";
import { ethers } from "ethers";
import { erc20Abi, formatUnits, parseEther } from "viem"; // Using viem for formatting
import EvmDustTokens from "../../../contracts/artifacts/contracts/EvmDustTokens.sol/EvmDustTokens.json";
import { evmAddresses, zetaAddresses } from "@/zetachain";

const evmDustTokenAddress = "0xC1dC7a8379885676a6Ea08E67b7Defd9a235De71";

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
      EvmDustTokens.abi,
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
  const SwapWethForDai = async function () {
    const args = {
      amount: "1.5",
      erc20: evmAddresses.weth!,
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
      EvmDustTokens.abi,
      signer
    );

    const txOptions = {
      gasLimit: args.txOptions.gasLimit,
      gasPrice: args.txOptions.gasPrice,
    };

    let tx;
    const erc20Contract = new ethers.Contract(args.erc20, erc20Abi, signer);
    const decimals = await erc20Contract.decimals();
    const value = utils.parseUnits(args.amount, decimals);
    // Approve the gateway to spend the tokens
    await erc20Contract.connect(signer).approve(evmDustTokenAddress, value);

    const method = "swapWETHForDAI(uint256)";

    // Call the deposit method for ETH on the gateway contract
    tx = await dustTokens[method](value, {
      ...txOptions,
    });

    return tx;
  };

  const evmSwapAndDepositAndCall = async function () {
    const args = {
      amount: "99",
      erc20: null,
      txOptions: {
        gasLimit: 1000000,
        gasPrice: ethers.BigNumber.from("1000000000"),
      },
      types: ["address", "bytes"],
      values: [zetaAddresses.usdc, hardhatAccount],
    };

    // Get MetaMask provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Request MetaMask account access and get signer
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const { utils } = ethers;
    const dustTokens = new ethers.Contract(
      evmDustTokenAddress,
      EvmDustTokens.abi,
      signer
    );

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
      //   // If ERC20 is specified, approve and call depositAndCall
      //   const erc20Contract = new ethers.Contract(args.erc20, zerc20Abi, signer);
      //   const decimals = await erc20Contract.decimals();
      //   const value = utils.parseUnits(args.amount, decimals);
      //   // Approve the gateway to spend tokens
      //   await erc20Contract.connect(signer).approve(args.gatewayEvm, value);
      //   const method =
      //     "depositAndCall(address,uint256,address,bytes,(address,bool,address,bytes,uint256))";
      //   tx = await gateway[method](
      //     args.receiver,
      //     value,
      //     args.erc20,
      //     encodedParameters,
      //     revertOptions,
      //     txOptions
      //   );
    } else {
      // If no ERC20, it's a native token transfer
      const value = utils.parseEther(args.amount);
      const method =
        "swapAndDepositAndCall(address,bytes,(address,bool,address,bytes,uint256))";
      tx = await dustTokens[method](encodedParameters, {
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
      <button onClick={SwapWethForDai} className="p-2 mt-6 border-2 rounded-md">
        Swap WETH to DAI
      </button>
    </div>
  );
}
