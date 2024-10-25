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

struct TokenSwap {
    address token;
    uint256 amount;
}

contract EvmDustTokens {
    GatewayEVM public gateway;
    uint256 constant BITCOIN = 18332;
    ISwapRouter public immutable swapRouter;
    address payable public immutable WETH9;

    uint24 public constant feeTier = 3000;

    // Define the event to track the swaps and deposits
    event SwappedAndDeposited(
        address indexed executor,
        PerformedSwap[] swaps,
        uint256 totalTokensReceived
    );

    // Define the PerformedSwap struct
    struct PerformedSwap {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
    }

    constructor(
        address payable gatewayAddress,
        ISwapRouter _swapRouter,
        address payable _WETH9
    ) {
        gateway = GatewayEVM(gatewayAddress);
        swapRouter = _swapRouter;
        WETH9 = _WETH9;
    }

    receive() external payable {}

    function SwapAndBridgeTokens(
        TokenSwap[] memory swaps,
        address universalApp,
        bytes calldata payload,
        RevertOptions calldata revertOptions
    ) external {
        uint256 totalTokensReceived = 0;
        address outputToken = WETH9;

        require(swaps.length > 0, "No swaps provided");

        // Create an array to store the performed swaps
        PerformedSwap[] memory performedSwaps = new PerformedSwap[](
            swaps.length
        );

        // Loop through each ERC-20 token address provided
        for (uint256 i = 0; i < swaps.length; i++) {
            TokenSwap memory swap = swaps[i];
            address token = swap.token;
            uint256 amount = swap.amount;

            // Check allowance and balance
            uint256 allowance = IERC20(token).allowance(
                msg.sender,
                address(this)
            );
            require(allowance >= amount, "Insufficient allowance for token");

            uint256 balance = IERC20(token).balanceOf(msg.sender);
            require(balance >= amount, "Insufficient token balance");

            // Transfer token from user to this contract
            TransferHelper.safeTransferFrom(
                token,
                msg.sender,
                address(this),
                amount
            );

            // Approve the swap router to spend the token
            TransferHelper.safeApprove(token, address(swapRouter), amount);

            // Build Uniswap Swap to convert the token to WETH
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: token,
                    tokenOut: outputToken,
                    fee: feeTier,
                    recipient: address(this), // Swap to this contract
                    deadline: block.timestamp,
                    amountIn: amount,
                    amountOutMinimum: 1, // TODO: Adjust for slippage tolerance
                    sqrtPriceLimitX96: 0
                });

            // Perform the swap
            uint256 amountOut = swapRouter.exactInputSingle(params);
            totalTokensReceived += amountOut;

            // Store the performed swap details
            performedSwaps[i] = PerformedSwap({
                tokenIn: token,
                tokenOut: WETH9,
                amountIn: amount,
                amountOut: amountOut
            });
        }

        IWETH(WETH9).withdraw(totalTokensReceived);

        gateway.depositAndCall{value: totalTokensReceived}(
            universalApp,
            payload,
            revertOptions
        );

        emit SwappedAndDeposited(
            msg.sender,
            performedSwaps,
            totalTokensReceived
        );
    }
}
