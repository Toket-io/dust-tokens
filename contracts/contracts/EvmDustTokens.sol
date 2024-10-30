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

// Custom ERC20 Interface with optional metadata functions
interface IERC20Metadata {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    function balanceOf(address account) external view returns (uint256);
}

struct SwapInput {
    address token;
    uint256 amount;
}

struct SwapOutput {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 amountOut;
}

contract EvmDustTokens {
    GatewayEVM public gateway;
    uint256 constant BITCOIN = 18332;
    address[] private tokenList;
    ISwapRouter public immutable swapRouter;
    address payable public immutable WETH9;
    uint24 public constant feeTier = 3000;

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event SwappedAndDeposited(
        address indexed executor,
        SwapOutput[] swaps,
        uint256 totalTokensReceived
    );
    event SwappedAndWithdrawn(
        address indexed receiver,
        address outputToken,
        uint256 totalTokensReceived
    );

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
        SwapInput[] memory swaps,
        address universalApp,
        bytes calldata payload,
        RevertOptions calldata revertOptions
    ) external {
        uint256 totalTokensReceived = 0;
        address outputToken = WETH9;

        require(swaps.length > 0, "No swaps provided");

        // Create an array to store the performed swaps
        SwapOutput[] memory performedSwaps = new SwapOutput[](swaps.length);

        // Loop through each ERC-20 token address provided
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInput memory swap = swaps[i];
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
            performedSwaps[i] = SwapOutput({
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

    // Tokens TODO: Add owner modifier
    function addToken(address token) public {
        require(token != address(0), "Invalid token address");
        tokenList.push(token);
        emit TokenAdded(token);
    }

    // Tokens TODO: Add owner modifier
    function removeToken(address token) public {
        require(token != address(0), "Invalid token address");

        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                emit TokenRemoved(token);
                break;
            }
        }
    }

    function getTokens() external view returns (address[] memory) {
        return tokenList;
    }

    function getBalances(
        address user
    )
        external
        view
        returns (
            address[] memory,
            string[] memory,
            string[] memory,
            uint8[] memory,
            uint256[] memory
        )
    {
        uint256 length = tokenList.length;

        address[] memory addresses = new address[](length);
        string[] memory names = new string[](length);
        string[] memory symbols = new string[](length);
        uint8[] memory decimalsList = new uint8[](length);
        uint256[] memory balances = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            IERC20Metadata token = IERC20Metadata(tokenList[i]);
            addresses[i] = tokenList[i];
            names[i] = token.name();
            symbols[i] = token.symbol();
            decimalsList[i] = token.decimals();
            balances[i] = token.balanceOf(user);
        }

        return (addresses, names, symbols, decimalsList, balances);
    }

    function ReceiveTokens(
        address outputToken,
        address receiver
    ) external payable {
        // TODO: add logic to avoid unnecessary swaps if the token is already WETH
        require(msg.value > 0, "No value provided");

        // Step 1: Swap msg.value to Wrapped Token (i.e: WETH or WMATIC)
        IWETH(WETH9).deposit{value: msg.value}();

        // Step 2: Approve swap router to spend WETH
        TransferHelper.safeApprove(WETH9, address(swapRouter), msg.value);

        // Step 3: Build Uniswap Swap to convert WETH to outputToken
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: outputToken,
                fee: feeTier,
                recipient: receiver, // Swap to this contract
                deadline: block.timestamp,
                amountIn: msg.value,
                amountOutMinimum: 1, // TODO: Adjust for slippage tolerance
                sqrtPriceLimitX96: 0
            });

        // Step 4: Perform the swap
        uint256 amountOut = swapRouter.exactInputSingle(params);

        emit SwappedAndWithdrawn(receiver, outputToken, amountOut);
    }
}
