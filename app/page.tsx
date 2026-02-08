"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useEnsAddress,
  useEnsText,
} from "wagmi";
import { parseUnits } from "viem";
import { normalize } from "viem/ens";
import { ensSwapAbi, erc20Abi } from "@/lib/abi";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

const TOKENS = [
  { label: "WETH", address: process.env.NEXT_PUBLIC_TOKEN_IN ?? "", decimals: 18 },
  { label: "UNI", address: process.env.NEXT_PUBLIC_TOKEN_OUT ?? "", decimals: 18 },
  { label: "USDC", address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6 },
] as const;

const FEE_TIERS = [
  { label: "0.05%", value: 500 },
  { label: "0.3%", value: 3000 },
  { label: "1%", value: 10000 },
];

export default function Home() {
  const { isConnected } = useAccount();

  const [ensName, setEnsName] = useState("");
  const [ensQuery, setEnsQuery] = useState("");
  const [tokenIn, setTokenIn] = useState(TOKENS[0].address);
  const [tokenOut, setTokenOut] = useState(TOKENS[1].address);
  const [amount, setAmount] = useState("");
  const [feeTier, setFeeTier] = useState(3000);
  const [slippage, setSlippage] = useState("50");
  const [localError, setLocalError] = useState("");

  const tokenInDecimals =
    TOKENS.find((t) => t.address === tokenIn)?.decimals ?? 18;

  // ENS resolution
  const normalizedName = ensQuery ? normalize(ensQuery) : undefined;

  const { data: ensAddress, isLoading: isResolvingEns } = useEnsAddress({
    name: normalizedName,
    chainId: 11155111,
  });

  const { data: ensSlippage } = useEnsText({
    name: normalizedName,
    key: "slippage",
    chainId: 11155111,
  });

  const { data: ensFee } = useEnsText({
    name: normalizedName,
    key: "fee",
    chainId: 11155111,
  });

  // Auto-fill slippage and fee from ENS records
  useEffect(() => {
    if (ensSlippage) setSlippage(ensSlippage);
  }, [ensSlippage]);

  useEffect(() => {
    if (ensFee) setFeeTier(Number(ensFee));
  }, [ensFee]);

  // Approve transaction
  const {
    writeContract: approve,
    data: approveTxHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  // Swap transaction
  const {
    writeContract: swap,
    data: swapTxHash,
    isPending: isSwapping,
    error: swapError,
  } = useWriteContract();

  const { isLoading: isSwapConfirming, isSuccess: isSwapConfirmed } =
    useWaitForTransactionReceipt({ hash: swapTxHash });

  function handleApprove() {
    if (!amount) return;
    setLocalError("");
    try {
      approve({
        address: tokenIn as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, parseUnits(amount, tokenInDecimals)],
      });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Invalid input");
    }
  }

  function handleSwap() {
    if (!amount) return;
    setLocalError("");
    try {
      swap({
        address: CONTRACT_ADDRESS,
        abi: ensSwapAbi,
        functionName: "swap",
        args: [
          tokenIn as `0x${string}`,
          tokenOut as `0x${string}`,
          parseUnits(amount, tokenInDecimals),
          feeTier,
          BigInt(slippage),
        ],
      });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Invalid input");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      {/* Header */}
      <header className="flex w-full max-w-3xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-black dark:text-white">
          ENS Swap
        </h1>
        <ConnectButton />
      </header>

      {/* Swap Card */}
      <main className="mt-16 w-full max-w-md px-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-6 text-lg font-semibold text-black dark:text-white">
            Swap
          </h2>

          {!isConnected ? (
            <p className="text-center text-sm text-zinc-500">
              Connect your wallet to start swapping.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {/* ENS Name */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500">ENS Name</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ensName}
                    onChange={(e) => setEnsName(e.target.value)}
                    placeholder="myname.eth"
                    className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-black outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                  <button
                    onClick={() => setEnsQuery(ensName)}
                    disabled={!ensName || isResolvingEns}
                    className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-200 dark:text-black dark:hover:bg-zinc-300"
                  >
                    {isResolvingEns ? "Resolving..." : "Resolve"}
                  </button>
                </div>
                {ensAddress && (
                  <div className="mt-1 rounded-md bg-green-50 px-3 py-2 dark:bg-green-950">
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Resolved: {ensAddress.slice(0, 6)}...{ensAddress.slice(-4)}
                    </p>
                    {ensSlippage && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Slippage: {ensSlippage} bps ({Number(ensSlippage) / 100}%)
                      </p>
                    )}
                    {ensFee && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Fee tier: {ensFee} ({Number(ensFee) / 10000}%)
                      </p>
                    )}
                  </div>
                )}
                {ensQuery && !isResolvingEns && !ensAddress && (
                  <p className="mt-1 text-xs text-red-500">
                    Could not resolve ENS name.
                  </p>
                )}
              </div>

              {/* Token In */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500">Token In</span>
                <select
                  value={tokenIn}
                  onChange={(e) => setTokenIn(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-black outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  {TOKENS.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Token Out */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500">Token Out</span>
                <select
                  value={tokenOut}
                  onChange={(e) => setTokenOut(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-black outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  {TOKENS.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Amount */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-black outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </label>

              {/* Fee Tier */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500">Fee Tier</span>
                <div className="flex gap-2">
                  {FEE_TIERS.map((tier) => (
                    <button
                      key={tier.value}
                      onClick={() => setFeeTier(tier.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        feeTier === tier.value
                          ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                          : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slippage */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-500">
                  Slippage (basis points, e.g. 50 = 0.5%)
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  placeholder="50"
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-black outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </label>

              {/* Buttons */}
              <div className="mt-2 flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isApproveConfirming || !amount}
                  className="flex-1 rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-200 dark:text-black dark:hover:bg-zinc-300"
                >
                  {isApproving
                    ? "Confirm in wallet..."
                    : isApproveConfirming
                      ? "Approving..."
                      : isApproveConfirmed
                        ? "Approved"
                        : "Approve"}
                </button>
                <button
                  onClick={handleSwap}
                  disabled={isSwapping || isSwapConfirming || !amount}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSwapping
                    ? "Confirm in wallet..."
                    : isSwapConfirming
                      ? "Swapping..."
                      : "Swap"}
                </button>
              </div>

              {/* Error Display */}
              {(approveError || swapError || localError) && (
                <div className="mt-2 rounded-lg bg-red-50 p-3 dark:bg-red-950">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    {localError ||
                      (approveError || swapError)?.message?.split("\n")[0]}
                  </p>
                </div>
              )}

              {/* Transaction Status */}
              {swapTxHash && (
                <div className="mt-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                  <p className="text-xs text-zinc-500">Transaction hash:</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${swapTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-xs text-blue-500 hover:underline"
                  >
                    {swapTxHash}
                  </a>
                  {isSwapConfirmed && (
                    <p className="mt-1 text-xs font-medium text-green-600">
                      Swap confirmed!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
