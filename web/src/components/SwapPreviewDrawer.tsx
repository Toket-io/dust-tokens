import * as React from "react";

import { cn } from "@/lib/utils";
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
  DrawerHeader,
  DrawerTrigger,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  ArrowDown,
  Asterisk,
  BadgeCheck,
  Camera,
  Coins,
  Pencil,
  Trash,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SelectedToken } from "./ArcherDemo";

type ProfileFormDrawerProps = {
  selectedTokens: SelectedToken[];
  selectedNetwork: {
    value: string;
    label: string;
  } | null;
  onConfirm: (selectedTokens: SelectedToken[]) => void;
};

export function SwapPreviewDrawer({
  selectedTokens,
  selectedNetwork,
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
      //   toast.error(m.generic_error_title(), {
      //     description: m.profile_save_error_message(),
      //   });
    } finally {
      setSaving(false);
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg">
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
              <span>{selectedNetwork?.label || "Not selected"}</span>
              <span>{"Calculating..."}</span>
            </div>
          </div>
          <DialogFooter className="flex flex-column mt-4">
            <Button
              variant="default"
              loading={saving}
              size="full"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
            <Button
              variant="outline"
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
        <Button size="lg">
          <Coins className="w-4 h-4 mr-2" />
          Preview Swap
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div>Content</div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
