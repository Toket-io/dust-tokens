import * as React from "react";
import Image from "next/image";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CircleCheck } from "lucide-react";

type SwapSuccessDrawerProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export function SwapSuccessDrawer({ open, setOpen }: SwapSuccessDrawerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleGoBack = () => {
    setOpen(false);
  };

  const handleOnOpenChange = (open: boolean) => {
    if (!open) {
      handleGoBack();
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOnOpenChange}>
        <DialogContent
          className="sm:max-w-[425px]"
          aria-describedby={"Success"}
        >
          <DialogHeader className="flex flex-col text-center items-center">
            <CircleCheck className="h-24 w-24 text-green-500 mb-6" />
            <DialogTitle>{"Success"}</DialogTitle>

            <DialogDescription>
              Your tokens have been successfully swapped and bridged!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Button className="w-full" onClick={handleGoBack}>
              Go back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOnOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex flex-col text-center items-center">
          <CircleCheck className="h-24 w-24 text-green-500 mb-6" />
          <DrawerTitle>{"Success"}</DrawerTitle>
          <DrawerDescription>
            Your tokens have been successfully swapped and bridged!
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col px-4 space-y-2">
          <Button className="w-full" onClick={handleGoBack}>
            Go back
          </Button>
        </div>
        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}
