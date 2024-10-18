// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "hardhat/console.sol"; // Import Hardhat's console for debugging

contract EvmDustTokens {
    ISwapRouter public immutable swapRouter;
    address public immutable DAI;
    address public immutable WETH9;
    address public immutable USDC;

    uint24 public constant feeTier = 3000;

    constructor(
        ISwapRouter _swapRouter,
        address _DAI,
        address _WETH9,
        address _USDC
    ) {
        swapRouter = _swapRouter;
        DAI = _DAI;
        WETH9 = _WETH9;
        USDC = _USDC;
    }

    function swapWETHForDAI(
        uint amountIn
    ) external returns (uint256 amountOut) {
        // Transfer the specified amount of WETH9 to this contract.
        TransferHelper.safeTransferFrom(
            WETH9,
            msg.sender,
            address(this),
            amountIn
        );
        // Approve the router to spend WETH9.
        TransferHelper.safeApprove(WETH9, address(swapRouter), amountIn);
        // Create the params that will be used to execute the swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: DAI,
                fee: feeTier,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
        return amountOut;
    }

    function executeMultiSwap(address[] memory tokenAddresses) public {
        // Create an array to store the performed swaps
        PerformedSwap[] memory performedSwaps = new PerformedSwap[](
            tokenAddresses.length
        );

        // Loop through each ERC-20 token address provided
        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            address token = tokenAddresses[i];

            // Check allowance and balance
            uint256 allowance = IERC20(token).allowance(
                msg.sender,
                address(this)
            );
            require(allowance > 0, "Insufficient allowance for token");

            uint256 balance = IERC20(token).balanceOf(msg.sender);
            require(balance >= allowance, "Insufficient token balance");

            // Transfer token from user to this contract
            TransferHelper.safeTransferFrom(
                token,
                msg.sender,
                address(this),
                allowance
            );

            // Approve the swap router to spend the token
            TransferHelper.safeApprove(token, address(swapRouter), allowance);

            // Build Uniswap Swap to convert the token to ERC20W
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: token,
                    tokenOut: WETH9,
                    fee: 3000,
                    recipient: msg.sender,
                    deadline: block.timestamp,
                    amountIn: allowance,
                    amountOutMinimum: 1, // Adjust for slippage tolerance
                    sqrtPriceLimitX96: 0
                });

            // Perform the swap
            uint256 amountOut = swapRouter.exactInputSingle(params);

            // Store the performed swap details
            performedSwaps[i] = PerformedSwap({
                tokenIn: token,
                tokenOut: WETH9,
                amountIn: allowance,
                amountOut: amountOut
            });
        }

        // Emit an event with the details of the performed swaps
        emit MultiSwapExecuted(msg.sender, performedSwaps);
    }

    // Define the event to track the swaps
    event MultiSwapExecuted(address indexed executor, PerformedSwap[] swaps);

    // Define the PerformedSwap struct
    struct PerformedSwap {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
    }
}
