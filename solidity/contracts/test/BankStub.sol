// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.20;

import "../bank/Bank.sol";

contract BankStub is Bank {
    function setBalance(address addr, uint256 amount) external {
        balanceOf[addr] = amount;
    }
}
