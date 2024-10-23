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

contract EvmDustTokens {
    GatewayEVM public gateway;
    uint256 constant BITCOIN = 18332;
    ISwapRouter public immutable swapRouter;
    address public immutable DAI;
    address payable public immutable WETH9;
    address public immutable USDC;
    address public immutable LINK;
    address public immutable UNI;
    address public immutable WBTC;

    uint24 public constant feeTier = 3000;

    // Define the event to track the swaps
    event MultiSwapExecuted(address indexed executor, PerformedSwap[] swaps);
    event MultiSwapExecutedAndWithdrawn(
        address indexed executor,
        uint256 totalWethReceived
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
        address _DAI,
        address payable _WETH9,
        address _USDC,
        address _LINK,
        address _UNI,
        address _WBTC
    ) {
        gateway = GatewayEVM(gatewayAddress);
        swapRouter = _swapRouter;
        DAI = _DAI;
        WETH9 = _WETH9;
        USDC = _USDC;
        LINK = _LINK;
        UNI = _UNI;
        WBTC = _WBTC;
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

    function swapWETHForUSDC(
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
                tokenOut: USDC,
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

    function swapWETHForLINK(
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
                tokenOut: LINK,
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

    function swapWETHForUNI(
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
                tokenOut: UNI,
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

    function swapWETHForWBTC(
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
                tokenOut: WBTC,
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

    function executeMultiSwapAndWithdraw(
        address[] memory tokenAddresses
    ) external {
        uint256 totalWethReceived = MultiSwap(tokenAddresses, WETH9);

        // Convert WETH to native ETH
        IWETH(WETH9).withdrawTo(msg.sender, totalWethReceived);
        // IWETH(WETH9).withdraw(totalWethReceived);

        emit MultiSwapExecutedAndWithdrawn(msg.sender, totalWethReceived);
    }

    function executeMultiSwapAndWithdrawUSDC(
        address[] memory tokenAddresses
    ) external {
        uint256 totalUSDCReceived = MultiSwap(tokenAddresses, USDC);

        TransferHelper.safeTransfer(USDC, msg.sender, totalUSDCReceived);

        emit MultiSwapExecutedAndWithdrawn(msg.sender, totalUSDCReceived);
    }

    function MultiSwap(
        address[] memory tokenAddresses,
        address outputToken
    ) internal returns (uint256) {
        uint256 totalTokensReceived = 0;

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

            // Build Uniswap Swap to convert the token to WETH
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: token,
                    tokenOut: outputToken,
                    fee: 3000,
                    recipient: address(this), // Swap to this contract
                    deadline: block.timestamp,
                    amountIn: allowance,
                    amountOutMinimum: 1, // Adjust for slippage tolerance
                    sqrtPriceLimitX96: 0
                });

            // Perform the swap
            uint256 amountOut = swapRouter.exactInputSingle(params);
            totalTokensReceived += amountOut;
        }

        return totalTokensReceived;
    }

    function TestDeposit() external payable {
        IWETH(WETH9).deposit{value: msg.value}();
    }

    function TestWithdrawToCaller(address receiver, uint256 amount) external {
        uint256 balance = IWETH(WETH9).balanceOf(address(this));
        require(balance >= amount, "Not enough WETH to withdraw");
        IWETH(WETH9).withdrawTo(receiver, amount);
    }

    function TestGetBalance() external view returns (uint256) {
        return IWETH(WETH9).balanceOf(address(this));
    }

    function TestGatewayDeposit(bytes memory recipient) external payable {
        require(msg.value > 0, "No ETH sent");

        gateway.deposit{value: msg.value}(
            address(uint160(bytes20(recipient))), // Ensure valid recipient address
            RevertOptions({
                revertAddress: address(0),
                callOnRevert: false,
                abortAddress: address(0),
                revertMessage: "",
                onRevertGasLimit: 0
            })
        );
    }
}
