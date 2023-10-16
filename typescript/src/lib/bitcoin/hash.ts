import { BigNumber, utils } from "ethers"
import { Hex } from "../utils"

/**
 * Computes the HASH160 (i.e. RIPEMD160(SHA256(text))) for the given text.
 * @param text Text the HASH160 is computed for.
 * @returns Hash as a 20-byte un-prefixed hex string.
 */
function computeHash160(text: string): string {
  const sha256Hash = utils.sha256(
    Hex.from(Buffer.from(text, "hex")).toPrefixedString()
  )
  const hash160 = utils.ripemd160(sha256Hash)

  return Hex.from(hash160).toString()
}

/**
 * Computes the double SHA256 for the given text.
 * @param text Text the double SHA256 is computed for.
 * @returns Hash as a 32-byte un-prefixed hex string.
 * @dev Do not confuse it with computeSha256 which computes single SHA256.
 */
function computeHash256(text: Hex): Hex {
  const firstHash = utils.sha256(text.toPrefixedString())
  const secondHash = utils.sha256(firstHash)

  return Hex.from(secondHash)
}

/**
 * Converts a hash in hex string in little endian to a BigNumber.
 * @param hash Hash in hex-string format.
 * @returns BigNumber representation of the hash.
 */
function hashLEToBigNumber(hash: Hex): BigNumber {
  return BigNumber.from(hash.reverse().toPrefixedString())
}

/**
 * Computes the single SHA256 for the given text.
 * @param text Text the single SHA256 is computed for.
 * @returns Hash as a 32-byte un-prefixed hex string.
 * @dev Do not confuse it with computeHash256 which computes double SHA256.
 */
function computeSha256(text: Hex): Hex {
  const hash = utils.sha256(text.toPrefixedString())
  return Hex.from(hash)
}

/**
 * Utility functions allowing to deal with Bitcoin hashes.
 */
export const BitcoinHashUtils = {
  computeHash160,
  computeHash256,
  hashLEToBigNumber,
  computeSha256,
}
