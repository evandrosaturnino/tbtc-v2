// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721 {
    string public constant NAME = "Test ERC721 Token";
    string public constant SYMBOL = "TT";

    constructor() ERC721(NAME, SYMBOL) {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}
