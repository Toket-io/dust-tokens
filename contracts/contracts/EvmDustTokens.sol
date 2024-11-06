// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import {GatewayEVM} from "@zetachain/protocol-contracts/contracts/evm/GatewayEVM.sol";

import {IPermit2} from "../lib/permit2/IPermit2.sol";
import {ISignatureTransfer} from "../lib/permit2/ISignatureTransfer.sol";
import {IAllowanceTransfer} from "../lib/permit2/IAllowanceTransfer.sol";

// Interface for WETH9 to allow withdrawals
interface IWETH is IERC20 {
    receive() external payable;

    function deposit() external payable;

    function withdraw(uint256 amount) external;
}

// Custom ERC20 Interface with optional metadata functions
interface IERC20Metadata is IERC20 {
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

contract EvmDustTokens is Ownable {
    GatewayEVM public immutable gateway;
    ISwapRouter public immutable swapRouter;
    IPermit2 public immutable permit2;
    address payable public immutable WETH9;

    mapping(address => bool) public whitelistedTokens;
    address[] public tokenList;
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
        address payable _WETH9,
        address initialOwner,
        IPermit2 _permit2
    ) Ownable(initialOwner) {
        gateway = GatewayEVM(gatewayAddress);
        swapRouter = _swapRouter;
        WETH9 = _WETH9;
        permit2 = _permit2;
    }

    receive() external payable {}

    function SwapAndBridgeTokens(
        SwapInput[] calldata swaps,
        address universalApp,
        bytes calldata payload,
        RevertOptions calldata revertOptions,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        uint256 totalTokensReceived = 0;
        address outputToken = WETH9;

        require(swaps.length > 0, "No swaps provided");

        // Batch transfer all input tokens using Permit2
        signatureBatchTransfer(swaps, nonce, deadline, signature);

        // Array to store performed swaps
        SwapOutput[] memory performedSwaps = new SwapOutput[](swaps.length);

        // Loop through each ERC-20 token address provided
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInput memory swap = swaps[i];
            address token = swap.token;
            uint256 amount = swap.amount;

            require(whitelistedTokens[token], "Swap token not whitelisted");

            // Approve the swap router to spend the token
            TransferHelper.safeApprove(token, address(swapRouter), amount);

            // Build Uniswap Swap to convert the token to WETH
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: token,
                    tokenOut: outputToken,
                    fee: feeTier,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amount,
                    amountOutMinimum: 1, // TODO: Adjust for slippage tolerance
                    sqrtPriceLimitX96: 0
                });

            // Perform the swap
            uint256 amountOut = swapRouter.exactInputSingle(params);
            totalTokensReceived += amountOut;

            // Store performed swap details
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

    function ReceiveTokens(
        address outputToken,
        address receiver
    ) external payable {
        require(msg.value > 0, "No value provided");

        // Check if the output token is whitelisted
        require(
            outputToken == address(0) || whitelistedTokens[outputToken],
            "Output token not whitelisted"
        );

        // If outputToken is 0x, send msg.value to the receiver
        if (outputToken == address(0)) {
            // Handle native token transfer
            (bool success, ) = receiver.call{value: msg.value}("");
            require(success, "Transfer of native token failed");
            emit SwappedAndWithdrawn(receiver, outputToken, msg.value);
        } else {
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
                    recipient: receiver,
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

    // Add token to whitelist
    function addToken(address token) public onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!whitelistedTokens[token], "Token already whitelisted");
        whitelistedTokens[token] = true;
        tokenList.push(token);
        emit TokenAdded(token);
    }

    // Remove token from whitelist
    function removeToken(address token) public onlyOwner {
        require(token != address(0), "Invalid token address");
        require(whitelistedTokens[token], "Token not whitelisted");
        whitelistedTokens[token] = false;

        // Remove token from the tokenList
        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        emit TokenRemoved(token);
    }

    function getTokens() external view returns (address[] memory) {
        return tokenList;
    }

    // Check if a token is whitelisted
    function isTokenWhitelisted(address token) external view returns (bool) {
        return whitelistedTokens[token];
    }

    // Function to check standard ERC20 allowance
    function hasPermit2Allowance(
        address user,
        address token,
        uint256 requiredAmount
    ) external view returns (bool) {
        uint256 allowanceAmount = IERC20(token).allowance(
            user,
            address(permit2)
        );
        return allowanceAmount >= requiredAmount;
    }

    function getBalances(
        address user
    )
        external
        view
        returns (
            address[] memory addresses,
            string[] memory names,
            string[] memory symbols,
            uint8[] memory decimalsArray,
            uint256[] memory balances
        )
    {
        uint256 tokenCount = tokenList.length;

        addresses = new address[](tokenCount);
        names = new string[](tokenCount);
        symbols = new string[](tokenCount);
        decimalsArray = new uint8[](tokenCount);
        balances = new uint256[](tokenCount);

        for (uint256 i = 0; i < tokenCount; i++) {
            if (whitelistedTokens[tokenList[i]]) {
                IERC20Metadata token = IERC20Metadata(tokenList[i]);
                addresses[i] = tokenList[i];
                names[i] = token.name();
                symbols[i] = token.symbol();
                decimalsArray[i] = token.decimals();
                balances[i] = token.balanceOf(user);
            }
        }
    }

    // Permit 2 Debugging
    // Normal SignatureTransfer
    function signatureTransfer(
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) public {
        permit2.permitTransferFrom(
            // The permit message. Spender is inferred as the caller (this contract)
            ISignatureTransfer.PermitTransferFrom({
                permitted: ISignatureTransfer.TokenPermissions({
                    token: token,
                    amount: amount
                }),
                nonce: nonce,
                deadline: deadline
            }),
            // Transfer details
            ISignatureTransfer.SignatureTransferDetails({
                to: address(this),
                requestedAmount: amount
            }),
            msg.sender, // The owner of the tokens has to be the signer
            signature // The resulting signature from signing hash of permit data per EIP-712 standards
        );
    }

    // Batch SignatureTransfer
    function signatureBatchTransfer(
        SwapInput[] calldata swaps,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) public {
        uint256 length = swaps.length;

        // Create arrays for TokenPermissions and SignatureTransferDetails
        ISignatureTransfer.TokenPermissions[]
            memory permitted = new ISignatureTransfer.TokenPermissions[](
                length
            );
        ISignatureTransfer.SignatureTransferDetails[]
            memory transferDetails = new ISignatureTransfer.SignatureTransferDetails[](
                length
            );

        for (uint256 i = 0; i < length; i++) {
            SwapInput calldata swap = swaps[i];
            address token = swap.token;
            uint256 amount = swap.amount;

            // Check allowance and balance
            uint256 allowance = IERC20(token).allowance(
                msg.sender,
                address(permit2)
            );
            require(allowance >= amount, "Insufficient allowance for token");

            uint256 balance = IERC20(token).balanceOf(msg.sender);
            require(balance >= amount, "Insufficient token balance");

            permitted[i] = ISignatureTransfer.TokenPermissions({
                token: token,
                amount: amount
            });

            transferDetails[i] = ISignatureTransfer.SignatureTransferDetails({
                to: address(this),
                requestedAmount: amount
            });
        }

        // Create the PermitBatchTransferFrom struct
        ISignatureTransfer.PermitBatchTransferFrom
            memory permit = ISignatureTransfer.PermitBatchTransferFrom({
                permitted: permitted,
                nonce: nonce,
                deadline: deadline
            });

        // Execute the batched permit transfer
        permit2.permitTransferFrom(
            permit,
            transferDetails,
            msg.sender, // The owner of the tokens
            signature
        );
    }
}
