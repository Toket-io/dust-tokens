"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ConnectBitcoin } from "@zetachain/universalkit";
import { ethers } from "ethers";
import ArcherDemo from "@/components/ArcherDemo";

export const provider = new ethers.providers.JsonRpcProvider(
  "http://localhost:8545"
);

// Provide your private key (keep it secure!)
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Create a wallet with the private key connected to the provider
export const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// // Get the MetaMask provider
// export const provider = new ethers.providers.Web3Provider(window.ethereum);

// // Request MetaMask to connect and get the signer (current connected account)
// // await provider.send("eth_requestAccounts", []); // Request connection
// export const signer = provider.getSigner(); // Get the signer from MetaMask

const Page = () => {
  return (
    <div className="m-4">
      <div className="flex justify-end gap-2 mb-10">
        <ConnectBitcoin />
        <ConnectButton label="Connect EVM" showBalance={true} />
      </div>
      <div className="p-8 mb-36">
        <ArcherDemo />
      </div>
    </div>
  );
};

export default Page;
