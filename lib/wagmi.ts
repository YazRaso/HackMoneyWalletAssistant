import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "ENS Swap",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [sepolia],
  ssr: true,
  transports: {
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
    ),
  },
});
