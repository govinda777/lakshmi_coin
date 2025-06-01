// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol"; // If individual token URIs are desired
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// Using ERC721Enumerable for on-chain enumeration of tokens,
// and Ownable for admin functions.
// ERC721URIStorage is not strictly needed if using a baseURI + tokenId pattern,
// but can be useful if individual tokens need distinct URIs not following that pattern.
// For simplicity, we'll use a baseURI + tokenId pattern first.

contract MembershipNFT is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    string private _baseTokenURI; // e.g., "ipfs://YOUR_METADATA_CID_HASH/" or "https://api.example.com/nft/lakshmi/"

    // Optional: Max supply for membership NFTs
    uint256 public maxSupply = 10000; // Example: 10,000 membership NFTs

    event AdminMint(address indexed to, uint256 indexed tokenId);
    event BaseURISet(string newBaseURI, address indexed setter);

    constructor(string memory name, string memory symbol, string memory initialBaseURI) ERC721(name, symbol) {
        _baseTokenURI = initialBaseURI;
    }

    /**
     * @dev Mints a new membership NFT to a specified address. Only callable by the owner.
     */
    function adminMint(address _to) external onlyOwner {
        require(_to != address(0), "ERC721: mint to the zero address");
        uint256 currentSupply = _tokenIdCounter.current();
        require(currentSupply < maxSupply, "MembershipNFT: Max supply reached");

        _tokenIdCounter.increment();
        uint256 newTokenId = _tokenIdCounter.current();
        _safeMint(_to, newTokenId);
        emit AdminMint(_to, newTokenId);
    }

    /**
     * @dev Sets the base URI for constructing token URIs. Only callable by the owner.
     * The URI should end with a trailing slash "/" if tokenId is appended directly.
     * e.g., "https://api.lakshmidao.org/memberships/"
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURISet(newBaseURI, msg.sender);
    }

    /**
     * @dev Returns the base URI for token metadata.
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Returns the URI for a given token ID.
     * Concatenates the base URI with the token ID.
     */
    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        // ERC721.sol's tokenURI will call _requireMinted(tokenId) first.
        // If not using ERC721URIStorage, we must implement this.
        // If _baseTokenURI is "ipfs://hash/" or "http://server/path/", then append tokenId.
        string memory base = _baseURI();
        // If base URI is empty, just return the tokenId as string (not ideal for metadata)
        if (bytes(base).length == 0) {
            return Strings.toString(tokenId);
        }
        // If the base URI already has a placeholder for ID (e.g. {id}), this logic would need to change.
        // Assuming direct concatenation: baseURI + tokenId + .json (common pattern)
        // For now, just baseURI + tokenId
        return string(abi.encodePacked(base, Strings.toString(tokenId)));
        // If you want a ".json" suffix:
        // return string(abi.encodePacked(base, Strings.toString(tokenId), ".json"));
    }


    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
