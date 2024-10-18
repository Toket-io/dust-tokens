// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {SystemContract, IZRC20} from "@zetachain/toolkit/contracts/SystemContract.sol";
import {SwapHelperLib} from "@zetachain/toolkit/contracts/SwapHelperLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import {GatewayEVM} from "@zetachain/protocol-contracts/contracts/evm/GatewayEVM.sol";
import {Swap} from "./Swap.sol";

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

// import {GatewayZEVM} from "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";
// import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";

contract EvmDustTokens {
    SystemContract public systemContract;
    GatewayEVM public gateway;
    Swap public universalApp;
    uint256 constant BITCOIN = 18332;
    ISwapRouter public immutable swapRouter;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    uint24 public constant feeTier = 3000;

    constructor(
        address systemContractAddress,
        address payable gatewayAddress,
        address universalAppAddress,
        ISwapRouter _swapRouter
    ) {
        systemContract = SystemContract(systemContractAddress);
        gateway = GatewayEVM(gatewayAddress);
        universalApp = Swap(universalAppAddress);
        swapRouter = _swapRouter;
    }

    struct Params {
        address target;
        bytes to;
    }

    function swapAndDeposit(bytes memory recipient) external payable {
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

    function swapAndDeposit2(
        address inputToken,
        uint256 amount,
        address targetToken,
        bytes memory recipient
    ) external payable {
        uint256 inputForGas;
        address gasZRC20;
        uint256 gasFee;
        uint256 swapAmount;

        uint256 outputAmount = SwapHelperLib.swapExactTokensForTokens(
            systemContract,
            inputToken,
            swapAmount,
            targetToken,
            0
        );

        IZRC20(targetToken).approve(address(gateway), outputAmount);

        IZRC20(targetToken).transfer(
            address(uint160(bytes20(recipient))),
            outputAmount
        );
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

    // function swapAndDepositAndCall(
    //     bytes memory recipient,
    //     bytes calldata payload
    // ) external payable {
    //     require(msg.value > 0, "No ETH sent");

    //     gateway.depositAndCall{value: msg.value}(
    //         address(uint160(bytes20(recipient))), // Ensure valid recipient address
    //         RevertOptions({
    //             revertAddress: address(0),
    //             callOnRevert: false,
    //             abortAddress: address(0),
    //             revertMessage: "",
    //             onRevertGasLimit: 0
    //         })
    //     );
    // }

    function testTransfer(address recipient) external payable {
        require(msg.value > 0, "No ETH sent");

        payable(recipient).transfer(msg.value);
    }
}
