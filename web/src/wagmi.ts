import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  bscTestnet,
  sepolia,
  zetachainAthensTestnet,
  localhost,
} from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "RainbowKit demo",
  projectId: "YOUR_PROJECT_ID",
  chains: [
    sepolia,
    bscTestnet,
    zetachainAthensTestnet,
    {
      id: 31337,
      name: "Localnet",
      nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
      },
      rpcUrls: {
        default: { http: ["http://localhost:8545"] },
      },
    },
  ],
});
