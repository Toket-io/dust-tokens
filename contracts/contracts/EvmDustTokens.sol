// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {SystemContract, IZRC20} from "@zetachain/toolkit/contracts/SystemContract.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {RevertContext, RevertOptions} from "@zetachain/protocol-contracts/contracts/Revert.sol";
import "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import {GatewayEVM} from "@zetachain/protocol-contracts/contracts/evm/GatewayEVM.sol";

// import {GatewayZEVM} from "@zetachain/protocol-contracts/contracts/zevm/GatewayZEVM.sol";
// import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";

contract EvmDustTokens {
    SystemContract public systemContract;
    GatewayEVM public gateway;
    uint256 constant BITCOIN = 18332;

    constructor(address systemContractAddress, address payable gatewayAddress) {
        systemContract = SystemContract(systemContractAddress);
        gateway = GatewayEVM(gatewayAddress);
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
}
