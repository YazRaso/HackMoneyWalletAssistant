import { ethers } from "hardhat";

async function main() {
  const SWAP_ROUTER = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";

  const ENSSwap = await ethers.getContractFactory("ENSSwap");
  const ensSwap = await ENSSwap.deploy(SWAP_ROUTER);
  await ensSwap.waitForDeployment();

  console.log("ENSSwap deployed to:", await ensSwap.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
