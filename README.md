# ENS Swap

A web app that resolves ENS names on Sepolia to read user-defined swap preferences (`slippage` and `fee` text records), then executes a Uniswap v3 swap through a custom smart contract using those parameters.

## How It Works

1. User connects their wallet (Sepolia testnet)
2. User enters an ENS name (registered on Sepolia)
3. App resolves the ENS name to an address and reads two text records:
   - `slippage` — slippage tolerance in basis points (e.g. `50` = 0.5%)
   - `fee` — Uniswap v3 pool fee tier (e.g. `3000` = 0.3%)
4. User approves token spending and executes the swap
5. The smart contract calls Uniswap v3's SwapRouter02, enforcing the ENS-derived slippage

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Wallet:** RainbowKit v2, wagmi v2, viem v2
- **Smart Contract:** Solidity 0.8.20, Hardhat v2
- **Network:** Sepolia testnet
- **DEX:** Uniswap v3 (SwapRouter02)

## Prerequisites

- Node.js >= 18
- A wallet with Sepolia ETH
- An ENS name registered on Sepolia with `slippage` and `fee` text records set

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your WalletConnect project ID>
NEXT_PUBLIC_ALCHEMY_API_KEY=<your Alchemy API key>
NEXT_PUBLIC_CONTRACT_ADDRESS=0xCDbe705BAe65ed0A33d8626DE3b464F8498913D9
NEXT_PUBLIC_UNISWAP_ROUTER=0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
NEXT_PUBLIC_TOKEN_IN=<ERC20 token address for input>
NEXT_PUBLIC_TOKEN_OUT=<ERC20 token address for output>
```

- Get a WalletConnect project ID at https://cloud.walletconnect.com
- Get an Alchemy API key at https://www.alchemy.com

### 3. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

### 4. Build for production

```bash
npm run build
npm start
```

## Smart Contract

The `ENSSwap` contract is deployed on Sepolia at:

```
0xCDbe705BAe65ed0A33d8626DE3b464F8498913D9
```

It wraps Uniswap v3 SwapRouter02's `exactInputSingle` with a slippage check. It accepts five parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| tokenIn | address | Input token address |
| tokenOut | address | Output token address |
| amountIn | uint256 | Amount of input tokens |
| feeTier | uint24 | Pool fee tier (500, 3000, or 10000) |
| slippage | uint256 | Slippage in basis points (50 = 0.5%) |

### Redeploying the contract

If you need to deploy your own instance:

```bash
ALCHEMY_API_KEY=<key> DEPLOYER_PRIVATE_KEY=<key> npx hardhat run scripts/deploy.ts --network sepolia
```

Then update `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local` with the new address.

## Tests

Run the smart contract test suite:

```bash
npx hardhat test
```

This runs 9 tests covering:
- Deployment and router address verification
- Successful swap execution
- Slippage enforcement (revert when output is too low)
- Exact boundary slippage behavior
- Insufficient balance / allowance reverts
- Different slippage values and fee tiers

## ENS Setup (Sepolia)

1. Go to https://sepolia.app.ens.domains
2. Register a `.eth` name on Sepolia
3. Set two text records on your name:
   - **Key:** `slippage` **Value:** e.g. `50` (basis points, 50 = 0.5%)
   - **Key:** `fee` **Value:** e.g. `3000` (Uniswap fee tier, 3000 = 0.3%)

## Demo Flow

1. Start the app (`npm run dev`)
2. Connect your wallet (switch to Sepolia)
3. Enter your ENS name (e.g. `myname.eth`)
4. Click **Resolve** — the app displays the resolved address, slippage, and fee tier
5. Enter a swap amount (e.g. `0.01`)
6. Click **Approve Token** — approve the contract to spend your input token
7. Click **Swap using ENS preferences** — executes the swap with ENS-derived parameters
8. Transaction hashes are displayed on success

## Project Structure

```
├── contracts/
│   ├── ENSSwap.sol                # Main swap contract
│   └── mocks/
│       ├── MockERC20.sol          # Mock token for tests
│       └── MockSwapRouter.sol     # Mock router for tests
├── test/
│   └── ENSSwap.test.ts            # Contract test suite
├── scripts/
│   └── deploy.ts                  # Deployment script
├── app/
│   ├── layout.tsx                 # Root layout with providers
│   ├── providers.tsx              # wagmi + RainbowKit providers
│   ├── page.tsx                   # Main UI
│   └── globals.css                # Tailwind styles
├── lib/
│   ├── wagmi.ts                   # wagmi/RainbowKit config
│   └── abi.ts                     # Contract ABIs
├── hardhat.config.ts              # Hardhat config
└── next.config.ts                 # Next.js config
```

## Key Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| ENSSwap | `0xCDbe705BAe65ed0A33d8626DE3b464F8498913D9` |
| Uniswap v3 SwapRouter02 | `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E` |
| WETH | `0xfff9976782d46cc05630d1f6ebab18b2324d6b14` |
| ENS Universal Resolver | `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe` |
