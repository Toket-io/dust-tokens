// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {SystemContract, IZRC20} from "@zetachain/toolkit/contracts/SystemContract.sol";
import {SwapHelperLib} from "@zetachain/toolkit/contracts/SwapHelperLib.sol";
import {BytesHelperLib} from "@zetachain/toolkit/contracts/BytesHelperLib.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import {GatewayZEVM} from "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";

contract Swap is UniversalContract {
    SystemContract public systemContract;
    GatewayZEVM public gateway;
    uint256 constant BITCOIN = 18332;

    constructor(address systemContractAddress, address payable gatewayAddress) {
        systemContract = SystemContract(systemContractAddress);
        gateway = GatewayZEVM(gatewayAddress);
    }

    struct Params {
        address target;
        bytes to;
        bytes destinationPayload;
    }

    function onCrossChainCall(
        zContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override {
        Params memory params = Params({
            target: address(0),
            to: bytes(""),
            destinationPayload: bytes("")
        });
        if (context.chainID == BITCOIN) {
            params.target = BytesHelperLib.bytesToAddress(message, 0);
            params.to = abi.encodePacked(
                BytesHelperLib.bytesToAddress(message, 20)
            );
        } else {
            (
                address targetToken,
                bytes memory recipient,
                bytes memory destinationPayload
            ) = abi.decode(message, (address, bytes, bytes));
            params.target = targetToken;
            params.to = recipient;
            params.destinationPayload = destinationPayload;
        }

        swapAndWithdraw(
            zrc20,
            amount,
            params.target,
            params.to,
            params.destinationPayload
        );
    }

    event Debug(
        bytes recipient,
        address inputToken,
        uint256 amount,
        address targetToken,
        uint256 targetAmount,
        address gasZRC20,
        uint256 gasFee,
        bytes payload
    );

    function swapAndWithdraw(
        address inputToken,
        uint256 amount,
        address targetToken,
        bytes memory recipient,
        bytes memory payload
    ) internal {
        uint256 inputForGas;
        address gasZRC20;
        uint256 gasFee;
        uint256 swapAmount;

        uint256 gasLimit = 7000000; // TODO: set correct gas limit

        // Get the gas fee required for withdrawal and call
        (gasZRC20, gasFee) = IZRC20(targetToken).withdrawGasFeeWithGasLimit(
            gasLimit
        );

        // Calculate the amount left after covering gas fees
        if (gasZRC20 == inputToken) {
            swapAmount = amount - gasFee;
        } else {
            inputForGas = SwapHelperLib.swapTokensForExactTokens(
                systemContract,
                inputToken,
                gasFee,
                gasZRC20,
                amount
            );
            swapAmount = amount - inputForGas;
        }

        // Perform the token swap if the input and target tokens are different
        uint256 outputAmount;
        if (inputToken != targetToken) {
            outputAmount = SwapHelperLib.swapExactTokensForTokens(
                systemContract,
                inputToken,
                swapAmount,
                targetToken,
                0
            );
        } else {
            outputAmount = swapAmount;
        }

        // Approve the gateway to spend the tokens
        if (gasZRC20 == targetToken) {
            IZRC20(gasZRC20).approve(address(gateway), outputAmount + gasFee);
        } else {
            IZRC20(gasZRC20).approve(address(gateway), gasFee);
            IZRC20(targetToken).approve(address(gateway), outputAmount);
        }

        // Prepare the revert options
        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(0),
            callOnRevert: false,
            abortAddress: address(0),
            revertMessage: "",
            onRevertGasLimit: 0
        });

        // Emit a debug event for monitoring
        emit Debug(
            recipient,
            inputToken,
            amount,
            targetToken,
            outputAmount,
            gasZRC20,
            gasFee,
            payload
        );

        // Execute the withdrawal and call operation via the gateway
        gateway.withdrawAndCall(
            recipient,
            outputAmount,
            targetToken,
            payload,
            gasLimit,
            revertOptions
        );
    }

    event HelloEvent(string, string);
    event RevertEvent(string, RevertContext);
    error TransferFailed();

    function call(
        bytes memory receiver,
        address zrc20,
        bytes calldata message,
        uint256 gasLimit,
        RevertOptions memory revertOptions
    ) external {
        (, uint256 gasFee) = IZRC20(zrc20).withdrawGasFeeWithGasLimit(gasLimit);
        if (!IZRC20(zrc20).transferFrom(msg.sender, address(this), gasFee)) {
            revert TransferFailed();
        }
        IZRC20(zrc20).approve(address(gateway), gasFee);
        gateway.call(receiver, zrc20, message, gasLimit, revertOptions);
    }

    function withdrawAndCall(
        bytes memory receiver,
        uint256 amount,
        address zrc20,
        bytes calldata message,
        uint256 gasLimit,
        RevertOptions memory revertOptions
    ) external {
        (address gasZRC20, uint256 gasFee) = IZRC20(zrc20)
            .withdrawGasFeeWithGasLimit(gasLimit);
        uint256 target = zrc20 == gasZRC20 ? amount + gasFee : amount;
        if (!IZRC20(zrc20).transferFrom(msg.sender, address(this), target))
            revert TransferFailed();
        IZRC20(zrc20).approve(address(gateway), target);
        if (zrc20 != gasZRC20) {
            if (
                !IZRC20(gasZRC20).transferFrom(
                    msg.sender,
                    address(this),
                    gasFee
                )
            ) revert TransferFailed();
            IZRC20(gasZRC20).approve(address(gateway), gasFee);
        }
        gateway.withdrawAndCall(
            receiver,
            amount,
            zrc20,
            message,
            gasLimit,
            revertOptions
        );
    }

    function onRevert(RevertContext calldata revertContext) external override {}
}
