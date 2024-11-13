import { SelectedToken } from "@/lib/types";
import { EvmDustTokens, readLocalnetAddresses } from "@/lib/zetachainUtils";
import React, { useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ethers } from "ethers";
import { PERMIT2_ADDRESS } from "@uniswap/Permit2-sdk";
import { toast } from "sonner";
import { Badge } from "./ui/badge";

export default function SwapTokenLine({ token }: { token: SelectedToken }) {
  const { address } = useAccount();

  const { data: permit2Enabled } = useReadContract({
    abi: EvmDustTokens.abi,
    address: readLocalnetAddresses(
      "ethereum",
      "EvmDustTokens"
    ) as `0x${string}`,
    functionName: "hasPermit2Allowance",
    args: [
      address,
      token.address,
      ethers.utils.parseUnits(token.amount, token.decimals),
    ],
    query: {
      enabled: !!address,
    },
  });

  const { data: hash, writeContract } = useWriteContract();

  const enablePermit2 = async (tokenAddress: string) => {
    const ercAbi = [
      "function approve(address spender, uint256 amount) returns (bool)",
    ];

    writeContract({
      address: token.address as `0x${string}`,
      abi: ercAbi,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, ethers.constants.MaxUint256],
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <span>
          {token.name} {`(${token.symbol})`}
        </span>
        <span>{token.amount}</span>
      </div>

      {!permit2Enabled && (
        <div className="flex justify-between items-center mt-2">
          <span className="text-red-500 mr-2 text-xs">
            Permit2 not enabled for {token.symbol}
          </span>
          <Badge
            className="cursor-pointer"
            variant="destructive"
            onClick={() => enablePermit2(token.address)}
          >
            Enable
          </Badge>
        </div>
      )}
    </div>
  );
}
