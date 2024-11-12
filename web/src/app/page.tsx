"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ConnectBitcoin } from "@zetachain/universalkit";
import { ethers } from "ethers";
import ArcherDemo from "@/components/ArcherDemo";

// Get the MetaMask provider
export const provider = new ethers.providers.Web3Provider(window.ethereum);

// Request MetaMask to connect and get the signer (current connected account)
export const signer = provider.getSigner(); // Get the signer from MetaMask

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
