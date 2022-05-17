// @ts-ignore
import bcoin from "bcoin"
// @ts-ignore
import { opcodes } from "bcoin/lib/script/common"
// @ts-ignore
import wif from "wif"
import { BigNumber } from "ethers"
import {
  Client as BitcoinClient,
  computeHash160,
  decomposeRawTransaction,
  isCompressedPublicKey,
  RawTransaction,
  UnspentTransactionOutput,
} from "./bitcoin"
import { Bridge, Identifier } from "./chain"

/**
 * Duration of the deposit refund locktime in seconds. After that time, the
 * depositor can make a refund of an unswept deposit using the refund public
 * key.
 */
export const DepositRefundLocktimeDuration = 2592000 // 30 days

/**
 * Represents a deposit.
 */
export interface Deposit {
  /**
   * Depositor's chain identifier.
   */
  depositor: Identifier

  /**
   * Deposit amount in satoshis.
   */
  amount: BigNumber

  /**
   * An 8-byte blinding factor as an un-prefixed hex string. Must be unique
   * for the given depositor, wallet public key and refund public key.
   */
  blindingFactor: string

  /**
   * Compressed (33 bytes long with 02 or 03 prefix) Bitcoin public key of
   * the wallet that is meant to receive the deposit.
   */
  walletPublicKey: string

  /**
   * Compressed (33 bytes long with 02 or 03 prefix) Bitcoin public key that
   * is meant to be used during deposit refund after the locktime passes.
   */
  refundPublicKey: string

  /**
   * A 4-byte little-endian refund locktime as an un-prefixed hex string.
   */
  refundLocktime: string

  /**
   * Optional identifier of the vault the deposit should be routed in.
   */
  vault?: Identifier
}

/**
 * Makes a deposit by creating and broadcasting a Bitcoin P2(W)SH
 * deposit transaction.
 * @param deposit - Details of the deposit.
 * @param depositorPrivateKey - Bitcoin private key of the depositor.
 * @param bitcoinClient - Bitcoin client used to interact with the network.
 * @param witness - If true, a witness (P2WSH) transaction will be created.
 *        Otherwise, a legacy P2SH transaction will be made.
 * @returns Deposit UTXO.
 */
export async function makeDeposit(
  deposit: Deposit,
  depositorPrivateKey: string,
  bitcoinClient: BitcoinClient,
  witness: boolean
): Promise<UnspentTransactionOutput> {
  const depositorKeyRing = createKeyRing(depositorPrivateKey)
  const depositorAddress = depositorKeyRing.getAddress("string")

  const utxos = await bitcoinClient.findAllUnspentTransactionOutputs(
    depositorAddress
  )

  const utxosWithRaw: (UnspentTransactionOutput & RawTransaction)[] = []
  for (const utxo of utxos) {
    const rawTransaction = await bitcoinClient.getRawTransaction(
      utxo.transactionHash
    )

    utxosWithRaw.push({
      ...utxo,
      transactionHex: rawTransaction.transactionHex,
    })
  }

  const { transactionHex, ...depositUtxo } = await createDepositTransaction(
    deposit,
    utxosWithRaw,
    depositorPrivateKey,
    witness
  )

  await bitcoinClient.broadcast({ transactionHex })

  return depositUtxo
}

/**
 * Creates a Bitcoin P2(W)SH deposit transaction.
 * @param deposit - Details of the deposit.
 * @param utxos - UTXOs that should be used as transaction inputs.
 * @param depositorPrivateKey - Bitcoin private key of the depositor.
 * @param witness - If true, a witness (P2WSH) transaction will be created.
 *        Otherwise, a legacy P2SH transaction will be made.
 * @returns Deposit UTXO with Bitcoin P2(W)SH deposit transaction data in raw format.
 */
export async function createDepositTransaction(
  deposit: Deposit,
  utxos: (UnspentTransactionOutput & RawTransaction)[],
  depositorPrivateKey: string,
  witness: boolean
): Promise<UnspentTransactionOutput & RawTransaction> {
  const depositorKeyRing = createKeyRing(depositorPrivateKey)
  const depositorAddress = depositorKeyRing.getAddress("string")

  const inputCoins = utxos.map((utxo) =>
    bcoin.Coin.fromTX(
      bcoin.MTX.fromRaw(utxo.transactionHex, "hex"),
      utxo.outputIndex,
      -1
    )
  )

  const transaction = new bcoin.MTX()

  const scriptHash = await createDepositScriptHash(deposit, witness)
  const outputValue = deposit.amount.toNumber()

  transaction.addOutput({
    script: witness
      ? bcoin.Script.fromProgram(0, scriptHash)
      : bcoin.Script.fromScripthash(scriptHash),
    value: outputValue,
  })

  await transaction.fund(inputCoins, {
    rate: null, // set null explicitly to always use the default value
    changeAddress: depositorAddress,
    subtractFee: false, // do not subtract the fee from outputs
  })

  transaction.sign(depositorKeyRing)

  return {
    transactionHash: transaction.txid(),
    outputIndex: 0, // There is only one output.
    value: outputValue,
    transactionHex: transaction.toRaw().toString("hex"),
  }
}

/**
 * Creates a Bitcoin locking script for P2(W)SH deposit transaction.
 * @param deposit - Details of the deposit.
 * @returns Script as an un-prefixed hex string.
 */
export async function createDepositScript(deposit: Deposit): Promise<string> {
  validateDeposit(deposit)

  // All HEXes pushed to the script must be un-prefixed.
  const script = new bcoin.Script()
  script.clear()
  script.pushData(Buffer.from(deposit.depositor.identifierHex, "hex"))
  script.pushOp(opcodes.OP_DROP)
  script.pushData(Buffer.from(deposit.blindingFactor, "hex"))
  script.pushOp(opcodes.OP_DROP)
  script.pushOp(opcodes.OP_DUP)
  script.pushOp(opcodes.OP_HASH160)
  script.pushData(Buffer.from(computeHash160(deposit.walletPublicKey), "hex"))
  script.pushOp(opcodes.OP_EQUAL)
  script.pushOp(opcodes.OP_IF)
  script.pushOp(opcodes.OP_CHECKSIG)
  script.pushOp(opcodes.OP_ELSE)
  script.pushOp(opcodes.OP_DUP)
  script.pushOp(opcodes.OP_HASH160)
  script.pushData(Buffer.from(computeHash160(deposit.refundPublicKey), "hex"))
  script.pushOp(opcodes.OP_EQUALVERIFY)
  script.pushData(Buffer.from(deposit.refundLocktime, "hex"))
  script.pushOp(opcodes.OP_CHECKLOCKTIMEVERIFY)
  script.pushOp(opcodes.OP_DROP)
  script.pushOp(opcodes.OP_CHECKSIG)
  script.pushOp(opcodes.OP_ENDIF)
  script.compile()

  // Return script as HEX string.
  return script.toRaw().toString("hex")
}

// eslint-disable-next-line valid-jsdoc
/**
 * Validates the given deposit parameters. Throws in case of a validation error.
 * @param deposit - The validated deposit.
 * @dev This function does not validate the depositor's identifier as its
 *      validity is chain-specific. This parameter must be validated outside.
 */
export function validateDeposit(deposit: Deposit) {
  if (!deposit.amount.gt(0)) {
    throw new Error("Amount must be greater than 0")
  }

  if (deposit.blindingFactor.length != 16) {
    throw new Error("Blinding factor must be an 8-byte number")
  }

  if (!isCompressedPublicKey(deposit.walletPublicKey)) {
    throw new Error("Wallet public key must be compressed")
  }

  if (!isCompressedPublicKey(deposit.refundPublicKey)) {
    throw new Error("Refund public key must be compressed")
  }

  if (deposit.refundLocktime.length != 8) {
    throw new Error("Refund locktime must be a 4-byte number")
  }
}

/**
 * Computes a refund locktime parameter for the given deposit creation timestamp.
 * Throws if the resulting locktime is not a 4-byte number.
 * @param depositCreatedAt - Unix timestamp in seconds determining the moment
 *                           of deposit creation.
 * @returns A 4-byte little-endian deposit refund locktime as an un-prefixed
 *          hex string.
 */
export function computeDepositRefundLocktime(depositCreatedAt: number): string {
  // Locktime is a Unix timestamp in seconds, computed as deposit creation
  // timestamp plus locktime duration.
  const locktime = BigNumber.from(
    depositCreatedAt + DepositRefundLocktimeDuration
  )

  if (locktime.toHexString().substring(2).length != 8) {
    throw new Error("Refund locktime must be a 4 bytes number")
  }

  // Bitcoin locktime is interpreted as little-endian integer so we must
  // adhere to that convention by converting the locktime accordingly.
  return Buffer.from(locktime.toHexString().substring(2), "hex")
    .reverse()
    .toString("hex")
}

/**
 * Creates a Bitcoin locking script hash for P2(W)SH deposit transaction.
 * @param deposit - Details of the deposit.
 * @param witness - If true, a witness script hash will be created.
 *        Otherwise, a legacy script hash will be made.
 * @returns Buffer with script hash.
 */
export async function createDepositScriptHash(
  deposit: Deposit,
  witness: boolean
): Promise<Buffer> {
  const script = await createDepositScript(deposit)
  // Parse the script from HEX string.
  const parsedScript = bcoin.Script.fromRaw(Buffer.from(script, "hex"))
  // If witness script hash should be produced, SHA256 should be used.
  // Legacy script hash needs HASH160.
  return witness ? parsedScript.sha256() : parsedScript.hash160()
}

/**
 * Creates a Bitcoin target address for P2(W)SH deposit transaction.
 * @param deposit - Details of the deposit.
 * @param network - Network that the address should be created for.
 *        For example, `main` or `testnet`.
 * @param witness - If true, a witness address will be created.
 *        Otherwise, a legacy address will be made.
 * @returns Address as string.
 */
export async function createDepositAddress(
  deposit: Deposit,
  network: string,
  witness: boolean
): Promise<string> {
  const scriptHash = await createDepositScriptHash(deposit, witness)
  const address = witness
    ? bcoin.Address.fromWitnessScripthash(scriptHash)
    : bcoin.Address.fromScripthash(scriptHash)
  return address.toString(network)
}

/**
 * Creates a Bitcoin key ring based on given private key.
 * @param privateKey Private key that should be used to create the key ring.
 * @returns Bitcoin key ring.
 */
function createKeyRing(privateKey: string): bcoin.KeyRing {
  const decodedPrivateKey = wif.decode(privateKey)

  return new bcoin.KeyRing({
    witness: true,
    privateKey: decodedPrivateKey.privateKey,
    compressed: decodedPrivateKey.compressed,
  })
}

/**
 * Reveals the given deposit to the on-chain Bridge contract.
 * @param utxo - Deposit UTXO of the revealed deposit.
 * @param deposit - Data of the revealed deposit.
 * @param bitcoinClient - Bitcoin client used to interact with the network.
 * @param bridge - Handle to the Bridge on-chain contract.
 * @returns Empty promise
 * @dev The caller must ensure that the given deposit data are valid and
 *      the given deposit UTXO actually originates from a deposit transaction
 *      that matches the given deposit data.
 */
export async function revealDeposit(
  utxo: UnspentTransactionOutput,
  deposit: Deposit,
  bitcoinClient: BitcoinClient,
  bridge: Bridge
): Promise<void> {
  const depositTx = decomposeRawTransaction(
    await bitcoinClient.getRawTransaction(utxo.transactionHash)
  )

  await bridge.revealDeposit(depositTx, utxo.outputIndex, deposit)
}
