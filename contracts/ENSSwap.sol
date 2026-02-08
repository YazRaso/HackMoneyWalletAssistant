// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);
}

contract ENSSwap {
    IV3SwapRouter public immutable swapRouter;

    mapping(address => bool) private _approvedTokens;

    constructor(address _swapRouter) {
        swapRouter = IV3SwapRouter(_swapRouter);
    }

    /// @param tokenIn Address of input token
    /// @param tokenOut Address of output token
    /// @param amountIn Amount of tokenIn to swap
    /// @param feeTier Pool fee tier (e.g. 3000 = 0.3%)
    /// @param slippage Slippage in basis points (e.g. 50 = 0.5%)
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 feeTier,
        uint256 slippage
    ) external returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Only approve once per token (saves ~45k gas on subsequent swaps)
        if (!_approvedTokens[tokenIn]) {
            IERC20(tokenIn).approve(address(swapRouter), type(uint256).max);
            _approvedTokens[tokenIn] = true;
        }

        uint256 amountOutMinimum = (amountIn * (10000 - slippage)) / 10000;

        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: feeTier,
                recipient: msg.sender,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        amountOut = swapRouter.exactInputSingle(params);
    }
}
