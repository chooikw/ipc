// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../src/LinkedTokenReplica.sol";
import "./ConfigManager.sol";
import "@ipc/src/structs/Subnet.sol";
import "openzeppelin-contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {Options} from "openzeppelin-foundry-upgrades/Options.sol";
import "forge-std/console.sol";

contract DeployIpcTokenReplica is ConfigManager {
    function deployIpcTokenReplicaProxy(address replicaProxy, address gateway, address tokenContractAddress, uint64 _rootNetChainId, address[] memory _route)  external {
        // Example for setting up the SubnetID, adjust according to your actual setup
        SubnetID memory destinationSubnet = SubnetID({root: _rootNetChainId, route: _route});

        vm.startBroadcast();

        Options memory opts;
        opts.unsafeAllow = "external-library-linking";


        address transparentProxy = Upgrades.deployTransparentProxy(
            "LinkedTokenReplica.sol",
            msg.sender,
            abi.encodeCall(LinkedTokenReplica.initialize, ( gateway, tokenContractAddress, destinationSubnet, msg.sender))
        );

        console.log("Beacon");
        console.log(vm.toString(transparentProxy));
        vm.stopBroadcast();

        /*
        Upgrades.deployBeaconProxy(beacon, abi.encodeCall(LinkedTokenReplica.initialize, ( gateway, tokenContractAddress, destinationSubnet, msg.sender)));
        console.log("Beacon");
        console.log(vm.toString(beacon));

        // Log the address of the deployed contract implementation
        writeConfig("LinkedTokenReplicaImplementation", vm.toString(beacon));
        */
    }


    function initializeIpcTokenReplica(address replicaProxy, address gateway, address tokenContractAddress, uint64 _rootNetChainId, address[] memory _route, address linkedContract) external {

        // Example for setting up the SubnetID, adjust according to your actual setup
        SubnetID memory destinationSubnet = SubnetID({root: _rootNetChainId, route: _route});

        vm.startBroadcast();
        LinkedTokenReplica replica = LinkedTokenReplica(replicaProxy);
        replica.initialize(gateway, tokenContractAddress, destinationSubnet, linkedContract);
        vm.stopBroadcast();
    }

    function upgradeIpcTokenReplica(address replicaProxy, address newReplicaImplementation) external {
        vm.startBroadcast();
        LinkedTokenReplica replica = LinkedTokenReplica(replicaProxy);
        replica.upgradeTo(newReplicaImplementation);
        vm.stopBroadcast();
    }
}

