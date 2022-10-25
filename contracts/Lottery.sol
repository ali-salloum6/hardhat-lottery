// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Lottery {
    uint256 private immutable i_entranceFee;

    constructor(uint256 entranceFee) {
        i_entranceFee = entranceFee;
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }
}