import { expect } from "chai";
import { ethers } from "hardhat";
import { ENSSwap, MockERC20, MockSwapRouter } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ENSSwap", function () {
  let ensSwap: ENSSwap;
  let tokenIn: MockERC20;
  let tokenOut: MockERC20;
  let mockRouter: MockSwapRouter;
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  const AMOUNT_IN = ethers.parseEther("1");
  const FEE_TIER = 3000; // 0.3%
  const SLIPPAGE = 50; // 0.5% in basis points

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    tokenIn = await MockERC20Factory.deploy();
    tokenOut = await MockERC20Factory.deploy();

    // Deploy mock router
    const MockSwapRouterFactory =
      await ethers.getContractFactory("MockSwapRouter");
    mockRouter = await MockSwapRouterFactory.deploy();

    // Deploy ENSSwap with mock router
    const ENSSwapFactory = await ethers.getContractFactory("ENSSwap");
    ensSwap = await ENSSwapFactory.deploy(await mockRouter.getAddress());

    // Setup: mint tokenIn to user and approve ENSSwap
    await tokenIn.mint(await user.getAddress(), AMOUNT_IN);
    await tokenIn
      .connect(user)
      .approve(await ensSwap.getAddress(), AMOUNT_IN);

    // Configure mock router
    await mockRouter.setTokenOut(await tokenOut.getAddress());
  });

  describe("Deployment", function () {
    it("should set the swap router address", async function () {
      expect(await ensSwap.swapRouter()).to.equal(
        await mockRouter.getAddress()
      );
    });
  });

  describe("swap", function () {
    it("should execute a swap successfully", async function () {
      const expectedOut = ethers.parseEther("0.997"); // above 0.995 minimum (50 bps slippage)
      await mockRouter.setMockAmountOut(expectedOut);

      await ensSwap
        .connect(user)
        .swap(
          await tokenIn.getAddress(),
          await tokenOut.getAddress(),
          AMOUNT_IN,
          FEE_TIER,
          SLIPPAGE
        );

      // User should have received tokenOut
      expect(await tokenOut.balanceOf(await user.getAddress())).to.equal(
        expectedOut
      );

      // User's tokenIn should be spent
      expect(await tokenIn.balanceOf(await user.getAddress())).to.equal(0);
    });

    it("should transfer tokenIn from user to contract", async function () {
      await mockRouter.setMockAmountOut(AMOUNT_IN);

      await ensSwap
        .connect(user)
        .swap(
          await tokenIn.getAddress(),
          await tokenOut.getAddress(),
          AMOUNT_IN,
          FEE_TIER,
          SLIPPAGE
        );

      expect(await tokenIn.balanceOf(await user.getAddress())).to.equal(0);
    });

    it("should revert when slippage is exceeded", async function () {
      // amountOutMinimum = 1e18 * (10000 - 50) / 10000 = 0.995e18
      // Set mock output below that threshold
      const tooLowOutput = ethers.parseEther("0.99");
      await mockRouter.setMockAmountOut(tooLowOutput);

      await expect(
        ensSwap
          .connect(user)
          .swap(
            await tokenIn.getAddress(),
            await tokenOut.getAddress(),
            AMOUNT_IN,
            FEE_TIER,
            SLIPPAGE
          )
      ).to.be.revertedWith("Too little received");
    });

    it("should pass when output equals amountOutMinimum exactly", async function () {
      // amountOutMinimum = 1e18 * (10000 - 50) / 10000 = 0.995e18
      const exactMinimum = (AMOUNT_IN * BigInt(10000 - SLIPPAGE)) / 10000n;
      await mockRouter.setMockAmountOut(exactMinimum);

      await ensSwap
        .connect(user)
        .swap(
          await tokenIn.getAddress(),
          await tokenOut.getAddress(),
          AMOUNT_IN,
          FEE_TIER,
          SLIPPAGE
        );

      expect(await tokenOut.balanceOf(await user.getAddress())).to.equal(
        exactMinimum
      );
    });

    it("should revert when user has insufficient balance", async function () {
      await mockRouter.setMockAmountOut(AMOUNT_IN);
      const doubleAmount = AMOUNT_IN * 2n;

      // Approve more but don't have the balance
      await tokenIn
        .connect(user)
        .approve(await ensSwap.getAddress(), doubleAmount);

      await expect(
        ensSwap
          .connect(user)
          .swap(
            await tokenIn.getAddress(),
            await tokenOut.getAddress(),
            doubleAmount,
            FEE_TIER,
            SLIPPAGE
          )
      ).to.be.revertedWith("Insufficient balance");
    });

    it("should revert when user has not approved enough", async function () {
      await mockRouter.setMockAmountOut(AMOUNT_IN);

      // Mint more tokens but don't approve enough
      const extraAmount = ethers.parseEther("2");
      await tokenIn.mint(await user.getAddress(), extraAmount);
      // Approval is still only AMOUNT_IN from beforeEach

      await expect(
        ensSwap
          .connect(user)
          .swap(
            await tokenIn.getAddress(),
            await tokenOut.getAddress(),
            extraAmount,
            FEE_TIER,
            SLIPPAGE
          )
      ).to.be.revertedWith("Insufficient allowance");
    });

    it("should calculate correct amountOutMinimum for different slippage values", async function () {
      // Test with 1% slippage (100 bps)
      const slippage100 = 100;
      const expectedMin = (AMOUNT_IN * BigInt(10000 - slippage100)) / 10000n;

      // Set output just at the minimum
      await mockRouter.setMockAmountOut(expectedMin);

      await ensSwap
        .connect(user)
        .swap(
          await tokenIn.getAddress(),
          await tokenOut.getAddress(),
          AMOUNT_IN,
          FEE_TIER,
          slippage100
        );

      expect(await tokenOut.balanceOf(await user.getAddress())).to.equal(
        expectedMin
      );
    });

    it("should work with different fee tiers", async function () {
      await mockRouter.setMockAmountOut(AMOUNT_IN);

      // Fee tier 500 (0.05%)
      await ensSwap
        .connect(user)
        .swap(
          await tokenIn.getAddress(),
          await tokenOut.getAddress(),
          AMOUNT_IN,
          500,
          SLIPPAGE
        );

      expect(await tokenOut.balanceOf(await user.getAddress())).to.equal(
        AMOUNT_IN
      );
    });
  });
});
