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

    try {
      let transportTokenAmount = ethers.BigNumber.from(0);

      for (const token of selectedTokens) {
        const parsedAmount = ethers.utils.parseUnits(
          token.amount,
          token.decimals
        );
        const swapTokenAmount = await getUniswapV3EstimatedAmountOut(
          token.address,
          ContractsConfig.evm_weth!,
          parsedAmount
        );

        transportTokenAmount = transportTokenAmount.add(swapTokenAmount);
      }

      const outputTokenAmount = await getUniswapV3EstimatedAmountOut(
        ContractsConfig.evm_weth!,
        selectedOutputToken.address,
        transportTokenAmount
      );

      // const zetachainExchangeRate = await getUniswapV2AmountOut(
      //   ContractsConfig.zeta_usdcEthToken,
      //   ContractsConfig.zeta_ethEthToken,
      //   parsedAmount
      // );

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

  async function getUniswapV3EstimatedAmountOut(
    tokenIn: string,
    tokenOut: string,
    amountIn: ethers.BigNumber
  ) {
    const quoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"; // Uniswap V3 Quoter address
    const quoterAbi = [
      "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)",
    ];

    // Initialize the Quoter contract
    const quoterContract = new ethers.Contract(
      quoterAddress,
      quoterAbi,
      provider
    );
    try {
      const amountOut: ethers.BigNumber =
        await quoterContract.callStatic.quoteExactInputSingle(
          tokenIn,
          tokenOut,
          3000,
          amountIn,
          0 // sqrtPriceLimitX96, set to 0 for no limit
        );
      return amountOut;
    } catch (error) {
      console.error("Error getting estimated amount out:", error);
      throw error;
    }
  }

  // async function getUniswapV2AmountOut(
  //   tokenIn: string,
  //   tokenOut: string,
  //   amountIn: ethers.BigNumber
  // ) {
  //   // Ensure amountInRaw is a string representing the amount (e.g., '1.0')

  //   const UNIVERSAL_APP_ABI = [
  //     "function getMinOutAmount(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 minOutAmount)",
  //   ];

  //   try {
  //     const contract = new ethers.Contract(
  //       ContractsConfig.zeta_universalDapp,
  //       UNIVERSAL_APP_ABI,
  //       provider
  //     );
  //     // Call the contract function
  //     const minOutAmount = await contract.getMinOutAmount(
  //       tokenIn,
  //       tokenOut,
  //       amountIn
  //     );

  //     // Format the output amount with tokenOut decimals
  //     const minOutAmountFormatted = ethers.utils.formatUnits(minOutAmount, 18);

  //     return minOutAmountFormatted;
  //   } catch (error) {
  //     console.error("Error fetching minOutAmount:", error);
  //     throw error;
  //   }
  // }

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
