// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../ENSSwap.sol";

interface IMockERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external;
}

contract MockSwapRouter {
    // Controls what the mock router returns as amountOut
    uint256 public mockAmountOut;

    address public tokenOutAddress;

    function setMockAmountOut(uint256 _amountOut) external {
        mockAmountOut = _amountOut;
    }

    function setTokenOut(address _tokenOut) external {
        tokenOutAddress = _tokenOut;
    }

    function exactInputSingle(
        IV3SwapRouter.ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut) {
        // Simulate the router: pull tokenIn from caller, send tokenOut to recipient
        // The ENSSwap contract has already approved this router
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

        // Revert if amountOut < amountOutMinimum (mimic real router behavior)
        require(mockAmountOut >= params.amountOutMinimum, "Too little received");

        // Mint tokenOut to the recipient (simulating a swap)
        IMockERC20(params.tokenOut).mint(params.recipient, mockAmountOut);

        return mockAmountOut;
    }
}
