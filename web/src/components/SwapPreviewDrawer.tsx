import * as React from "react";
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
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
              <span>{"Calculating..."}</span>
            </div>
          </div>
          <DialogFooter className="flex flex-column mt-4">
            <Button
              variant="default"
              disabled={disabled}
              loading={saving}
              size="full"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
            <Button
              variant="outline"
              disabled={disabled}
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
