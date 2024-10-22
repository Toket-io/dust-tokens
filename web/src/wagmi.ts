import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  bscTestnet,
  sepolia,
  zetachainAthensTestnet,
  hardhat,
  localhost,
} from "wagmi/chains";

const customLocalHost = {
  ...localhost,
  id: 42161,
};
export const config = getDefaultConfig({
  appName: "RainbowKit demo",
  projectId: "YOUR_PROJECT_ID",
  chains: [
    sepolia,
    bscTestnet,
    zetachainAthensTestnet,
    // hardhat,
    customLocalHost,
  ],
});
