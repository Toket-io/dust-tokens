import React, { useEffect } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { ArrowDown, Coins } from "lucide-react";
import { Network, SelectedToken, Token } from "./ArcherDemo";
import { toast } from "sonner";
import { ethers } from "ethers";
import { provider, signer } from "@/app/page";
import ContractsConfig from "../../../ContractsConfig";
import { getUniswapV3EstimatedAmountOut } from "@/lib/zetachainUtils";

type ProfileFormDrawerProps = {
  selectedTokens: SelectedToken[];
  selectedNetwork: Network | null;
  selectedOutputToken: Token | null;
  disabled?: boolean;
  onConfirm: (selectedTokens: SelectedToken[]) => void;
};

export function SwapPreviewDrawer({
  selectedTokens,
  selectedNetwork,
  selectedOutputToken,
  disabled = false,
  onConfirm,
}: ProfileFormDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [amountOut, setAmountOut] = React.useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    const initializeProvider = async () => {
      calculateOutputTokenAmount();
    };

    initializeProvider();
  }, [open, selectedTokens, selectedNetwork, selectedOutputToken]);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setOpen(false);
      onConfirm(selectedTokens);
    } catch (error) {
      toast.error("Something went wrong. Please try again later.");
    } finally {
      setSaving(false);
    }
  };

  function truncateToDecimals(value: string, decimals: number) {
    if (value.indexOf(".") === -1) {
      // No decimal point, return the value as is
      return value;
    }
    const parts = value.split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1].slice(0, decimals);
    return `${integerPart}.${decimalPart}`;
  }

  const calculateOutputTokenAmount = async () => {
    if (!open || !selectedOutputToken || !selectedNetwork) {
      return;
    }
    setAmountOut(null);

    const slippageBPS = 50;
    try {
      let transportTokenAmount = ethers.BigNumber.from(0);

      for (const token of selectedTokens) {
        const parsedAmount = ethers.utils.parseUnits(
          token.amount,
          token.decimals
        );
        const swapTokenAmount = await getUniswapV3EstimatedAmountOut(
          provider,
          ContractsConfig.evm_uniswapQuoterV3,
          token.address,
          ContractsConfig.evm_weth!,
          parsedAmount,
          slippageBPS
        );

        transportTokenAmount = transportTokenAmount.add(swapTokenAmount);
      }

      const outputTokenAmount = await getUniswapV3EstimatedAmountOut(
        provider,
        ContractsConfig.evm_uniswapQuoterV3,
        ContractsConfig.evm_weth!,
        selectedOutputToken.address,
        transportTokenAmount,
        slippageBPS
      );

      // const zetachainExchangeRate = await getUniswapV2AmountOut(
      //   "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe",
      //   "0x65a45c57636f9BcCeD4fe193A602008578BcA90b",
      //   transportTokenAmount
      // );

      // console.log("ZETA EXCHANGE RATE:", zetachainExchangeRate);

      // console.log("ZETA EXCHANGE RATE:", zetachainExchangeRate);

      const parsedOutputTokenAmount = ethers.utils.formatUnits(
        outputTokenAmount,
        selectedOutputToken.decimals
      );

      // Truncate to 4 decimal places
      const outputAmountWithFourDecimals = truncateToDecimals(
        parsedOutputTokenAmount,
        4
      );

      console.log("amountOut", outputAmountWithFourDecimals);
      setAmountOut(outputAmountWithFourDecimals);
    } catch (error) {
      console.error("Error calculating output token amount:", error);
    }
  };

  async function getUniswapV2AmountOut(
    tokenIn: string,
    tokenOut: string,
    amountIn: ethers.BigNumber
  ) {
    const uniswapV2FactoryAddress = ContractsConfig.zeta_uniswapFactoryV2;
    const uniswapV2FactoryAbi = [
      "function getPair(address tokenA, address tokenB) external view returns (address pair)",
    ];
    const uniswapV2Factory = new ethers.Contract(
      uniswapV2FactoryAddress,
      uniswapV2FactoryAbi,
      provider
    );
    const uniswapV2PairAbi = [
      "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
      "function token0() external view returns (address)",
      "function token1() external view returns (address)",
    ];
    try {
      // Step 1: Get the pair address
      const pairAddress = await uniswapV2Factory.getPair(tokenIn, tokenOut);
      if (pairAddress === ethers.constants.AddressZero) {
        throw new Error("Pair does not exist.");
      }

      // Step 2: Create a contract instance for the pair
      const pairContract = new ethers.Contract(
        pairAddress,
        uniswapV2PairAbi,
        provider
      );

      // Step 3: Get reserves and token order
      const [reserve0, reserve1] = await pairContract.getReserves();
      const token0 = await pairContract.token0();
      const token1 = await pairContract.token1();

      // Step 4: Determine the correct reserve ordering
      let reserveIn, reserveOut;
      if (tokenIn.toLowerCase() === token0.toLowerCase()) {
        reserveIn = reserve0;
        reserveOut = reserve1;
      } else if (tokenIn.toLowerCase() === token1.toLowerCase()) {
        reserveIn = reserve1;
        reserveOut = reserve0;
      } else {
        throw new Error("Invalid token addresses.");
      }

      // Step 5: Apply the Uniswap V2 formula to get the amount out
      // Uniswap V2 formula: amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
      const amountInWithFee = amountIn.mul(997);
      const numerator = amountInWithFee.mul(reserveOut);
      const denominator = reserveIn.mul(1000).add(amountInWithFee);
      const amountOut = numerator.div(denominator);

      return amountOut;
    } catch (error) {
      console.error("Error getting estimated amount out:", error);
      throw error;
    }
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg" disabled={disabled}>
            <Coins className="w-4 h-4 mr-2" />
            Preview Swap
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="w-full text-center">
              Preview Swap
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="font-semibold">Input Tokens:</div>
            {selectedTokens.map((token, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>
                  {token.name} {`(${token.symbol})`}
                </span>
                <span>{token.amount}</span>
              </div>
            ))}
            <div className="flex justify-center my-2">
              <ArrowDown className="h-6 w-6" />
            </div>
            <div className="font-semibold">Output Network & Token:</div>
            <div className="flex justify-between items-center">
              <span>{`${selectedOutputToken?.name} @ ${selectedNetwork?.label}`}</span>

              <span>
                {amountOut
                  ? `${amountOut} ${selectedOutputToken?.symbol}`
                  : "Calculating..."}
              </span>
            </div>
          </div>
          <DialogFooter className="flex flex-column mt-4">
            <Button
              variant="default"
              disabled={disabled || !amountOut}
              loading={saving}
              size="full"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
            <Button
              variant="outline"
              disabled={disabled || !amountOut || saving}
              size="full"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="lg" disabled={disabled}>
          <Coins className="w-4 h-4 mr-2" />
          Preview Swap
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div>Content</div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button disabled={disabled} variant="outline">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
