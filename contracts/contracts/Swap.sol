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

    event Reverted(bytes recipient, address asset, uint256 amount);

    modifier onlyGateway() {
        require(msg.sender == address(gateway), "Caller is not the gateway");
        _;
    }

    constructor(address systemContractAddress, address payable gatewayAddress) {
        systemContract = SystemContract(systemContractAddress);
        gateway = GatewayZEVM(gatewayAddress);
    }

    struct Params {
        address targetChainToken;
        bytes targetChainCounterparty;
        bytes recipient;
        bytes destinationPayload;
    }

    function onCall(
        MessageContext calldata,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external onlyGateway {
        Params memory params;
        (
            params.targetChainToken,
            params.targetChainCounterparty,
            params.recipient,
            params.destinationPayload
        ) = abi.decode(message, (address, bytes, bytes, bytes));

        swapAndWithdraw(zrc20, amount, params);
    }

    function swapAndWithdraw(
        address inputToken,
        uint256 amount,
        Params memory params
    ) internal {
        uint256 inputForGas;
        address gasZRC20;
        uint256 gasFee;
        uint256 swapAmount;

        uint256 gasLimit = 7000000; // TODO: set correct gas limit

        // Get the gas fee required for withdrawal and call
        (gasZRC20, gasFee) = IZRC20(params.targetChainToken)
            .withdrawGasFeeWithGasLimit(gasLimit);

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
        if (inputToken != params.targetChainToken) {
            outputAmount = SwapHelperLib.swapExactTokensForTokens(
                systemContract,
                inputToken,
                swapAmount,
                params.targetChainToken,
                0
            );
        } else {
            outputAmount = swapAmount;
        }

        // Approve the gateway to spend the tokens
        if (gasZRC20 == params.targetChainToken) {
            IZRC20(gasZRC20).approve(address(gateway), outputAmount + gasFee);
        } else {
            IZRC20(gasZRC20).approve(address(gateway), gasFee);
            IZRC20(params.targetChainToken).approve(
                address(gateway),
                outputAmount
            );
        }

        // Prepare the revert options
        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(0),
            revertMessage: abi.encode(params.recipient),
            onRevertGasLimit: 7000000
        });

        // Execute the withdrawal and call operation via the gateway
        CallOptions memory callOptions = CallOptions(gasLimit, true);
        gateway.withdrawAndCall(
            params.targetChainCounterparty,
            outputAmount,
            params.targetChainToken,
            params.destinationPayload,
            callOptions,
            revertOptions
        );
    }

    function onRevert(
        RevertContext calldata revertContext
    ) external payable onlyGateway {
        address targetToken = revertContext.asset;
        uint256 amount = revertContext.amount;

        // Transfer the reverted tokens back to the contract
        IZRC20(targetToken).transfer(address(this), amount);

        // Decode the revert message
        bytes memory recipient = abi.decode(
            revertContext.revertMessage,
            (bytes)
        );

        RevertOptions memory revertOptions = RevertOptions({
            revertAddress: address(this),
            callOnRevert: true,
            abortAddress: address(0),
            revertMessage: "",
            onRevertGasLimit: 0
        });

        address gasZRC20;
        uint256 gasFee;

        (gasZRC20, gasFee) = IZRC20(targetToken).withdrawGasFee();

        uint256 outputAmount = amount - gasFee;

        IZRC20(gasZRC20).approve(address(gateway), outputAmount + gasFee);

        // Withdraw the tokens to the original recipient
        gateway.withdraw(recipient, outputAmount, targetToken, revertOptions);

        emit Reverted(recipient, targetToken, outputAmount);
    }
}
