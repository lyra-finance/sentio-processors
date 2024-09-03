import { EthChainId, EthContext, getProvider } from "@sentio/sdk/eth"
import { DeriveVaultTokenPrice } from "../schema/store.js"
import { getLyraVaultTokenContract, getLyraVaultTokenContractOnContext } from "../types/eth/lyravaulttoken.js"
import { MILLISECONDS_PER_DAY } from "../config.js"
import { BigDecimal } from "@sentio/sdk"
import { getAddress } from "ethers"
import { estimateBlockNumberAtDate } from "./crosschainBlocks.js"


export async function saveCurrentVaultTokenPrice(ctx: EthContext, vaultTokenAddress: string, predepositUpgradeTimestampMs: number | undefined) {
    const nowMs = ctx.timestamp.getTime()
    const nowMsBigInt = BigInt(nowMs)
    vaultTokenAddress = getAddress(vaultTokenAddress)

    // Skip saving if Pre-Deposit Upgrade not yet enabled
    if (predepositUpgradeTimestampMs && nowMsBigInt < BigInt(predepositUpgradeTimestampMs)) {
        // console.log(`Skipping token price save at time ${nowMsBigInt} for ${vaultTokenAddress} as it's before pre-deposit upgrade`)
        return
    } else {
        console.log(`${vaultTokenAddress}, ${nowMsBigInt}, ${predepositUpgradeTimestampMs}`)
    }

    // This is taken exclusively from the Lyra Chain
    const vaultTokenContract = getLyraVaultTokenContract(EthChainId.BITLAYER, vaultTokenAddress)
    try {
        const lyraProvider = getProvider(EthChainId.BITLAYER)
        const lyraBlock = await estimateBlockNumberAtDate(lyraProvider, new Date(nowMs))
        const shareToUnderlying = (await vaultTokenContract.getSharesValue("1000000000000000000", { blockTag: lyraBlock })).scaleDown(18)
        console.log(`For ${vaultTokenAddress} got ${shareToUnderlying}`)
        await ctx.store.upsert(new DeriveVaultTokenPrice({
            id: `${vaultTokenAddress}-${nowMsBigInt}`,
            vaultAddress: vaultTokenAddress,
            timestampMs: nowMsBigInt,
            vaultToUnderlying: shareToUnderlying
        }))

    } catch (e) {
        console.log(`Error calling getSharesValue for ${vaultTokenAddress} at ${nowMsBigInt}: ${e.message}`)
        return
    }
}

export async function toUnderlyingBalance(ctx: EthContext, vaultAddress: string, vaultBalance: BigDecimal, snapshotTimestampMs: bigint): Promise<BigDecimal> {
    vaultAddress = getAddress(vaultAddress)

    // Gets closest vault token price +/- 1 day
    const upperBound = snapshotTimestampMs + BigInt(MILLISECONDS_PER_DAY * 5)
    const lowerBound = snapshotTimestampMs - BigInt(MILLISECONDS_PER_DAY * 5)
    const pricesNearby = await ctx.store.list(DeriveVaultTokenPrice, [
        { field: "vaultAddress", op: "=", value: vaultAddress },
        { field: "timestampMs", op: "<", value: upperBound },
        { field: "timestampMs", op: ">", value: lowerBound }
    ])

    console.log(`Looking through prices nearby for vault ${vaultAddress} with length ${pricesNearby.length} at timestamp ${snapshotTimestampMs} with bounds ${lowerBound} and ${upperBound}`)
    let tokenPriceWithinBounds: DeriveVaultTokenPrice | undefined = await _find_closest_snapshot(pricesNearby, snapshotTimestampMs)

    // handle the last batch
    if (!tokenPriceWithinBounds) {
        return vaultBalance
    }
    console.log(`Found token price within bounds for vault ${vaultAddress}`)
    return tokenPriceWithinBounds.vaultToUnderlying.multipliedBy(vaultBalance)
}

async function _find_closest_snapshot(pricesNearby: DeriveVaultTokenPrice[], snapshotTimestampMs: bigint): Promise<DeriveVaultTokenPrice | undefined> {
    let tokenPriceWithinBounds: DeriveVaultTokenPrice | undefined;
    let timestampDiff = BigInt(Number.MAX_SAFE_INTEGER)
    for (const tokenPrice of pricesNearby) {
        let diff = snapshotTimestampMs - tokenPrice.timestampMs
        if (diff < 0) diff = -diff

        if (diff < timestampDiff) {
            timestampDiff = diff
            tokenPriceWithinBounds = tokenPrice
        }
    }
    return tokenPriceWithinBounds
}