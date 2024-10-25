// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import {GatewayEVM} from "@zetachain/protocol-contracts/contracts/evm/GatewayEVM.sol";

// Interface for WETH9 to allow withdrawals
interface IWETH is IERC20 {
    receive() external payable;

    function deposit() external payable;

    function withdraw(uint256 amount) external;

    function withdrawTo(address account, uint256 amount) external;
}

contract SimpleSwap {
    ISwapRouter public immutable swapRouter;
    address payable public immutable WETH9;

    constructor(ISwapRouter _swapRouter, address payable _WETH9) {
        swapRouter = _swapRouter;
        WETH9 = _WETH9;
    }

    receive() external payable {}

    function ExecuteMultiSwapFromWETH(
        address[] memory tokenAddresses,
        uint256 amountIn
    ) external {
        MultiSwap(tokenAddresses, WETH9, amountIn);
    }

    function MultiSwap(
        address[] memory tokenAddresses,
        address inputToken,
        uint256 amountIn
    ) internal returns (uint256) {
        uint256 totalTokensReceived = 0;

        // Loop through each ERC-20 token address provided
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            address token = tokenAddresses[i];

            // Check allowance and balance
            uint256 allowance = IERC20(inputToken).allowance(
                msg.sender,
                address(this)
            );
            require(allowance > 0, "Insufficient allowance for input token");

            uint256 balance = IERC20(inputToken).balanceOf(msg.sender);
            require(balance >= allowance, "Insufficient input token balance");

            // Transfer token from user to this contract
            TransferHelper.safeTransferFrom(
                inputToken,
                msg.sender,
                address(this),
                amountIn
            );

            // Approve the swap router to spend the token
            TransferHelper.safeApprove(
                inputToken,
                address(swapRouter),
                amountIn
            );

            // Build Uniswap Swap to convert the token to WETH
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: inputToken,
                    tokenOut: token,
                    fee: 3000,
                    recipient: msg.sender, // Swap to this contract
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: 1, // Adjust for slippage tolerance
                    sqrtPriceLimitX96: 0
                });

            // Perform the swap
            swapRouter.exactInputSingle(params);
        }

        return totalTokensReceived;
    }
}
