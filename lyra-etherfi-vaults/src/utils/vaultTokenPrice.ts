import { EthContext } from "@sentio/sdk/eth"
import { LyraVaultTokenPrice } from "../schema/store.js"
import { getLyraVaultTokenContractOnContext } from "../types/eth/lyravaulttoken.js"
import { MILLISECONDS_PER_DAY } from "../config.js"
import { BigDecimal } from "@sentio/sdk"
import { getAddress } from "ethers"

export async function saveCurrentVaultTokenPrice(ctx: EthContext, vaultTokenAddress: string, predepositUpgradeTimestampMs: number | undefined) {
    console.log("Getting token price on timestamp", ctx.timestamp.getTime())
    const nowMs = BigInt(ctx.timestamp.getTime())
    vaultTokenAddress = getAddress(vaultTokenAddress)

    // Skip saving if Pre-Deposit Upgrade not yet enabled
    console.log(`${vaultTokenAddress}, ${nowMs}, ${predepositUpgradeTimestampMs}`)
    if (predepositUpgradeTimestampMs && nowMs < BigInt(predepositUpgradeTimestampMs)) {
        console.log(`Skipping token price save at time ${nowMs} for ${vaultTokenAddress} as it's before pre-deposit upgrade`)
        return
    } else {
        console.log(`${vaultTokenAddress}, ${nowMs}, ${predepositUpgradeTimestampMs}`)
    }

    // This is taken exclusively from the Lyra Chain
    const vaultTokenContract = getLyraVaultTokenContractOnContext(ctx, vaultTokenAddress)
    vaultTokenContract.address = vaultTokenAddress
    const shareToUnderlying = (await vaultTokenContract.getSharesValue("1000000000000000000")).scaleDown(18)

    ctx.store.upsert(new LyraVaultTokenPrice({
        id: `${vaultTokenAddress}-${nowMs}`,
        vaultAddress: vaultTokenAddress,
        timestampMs: nowMs,
        vaultToUnderlying: shareToUnderlying
    }))
}

export async function toUnderlyingBalance(ctx: EthContext, vaultAddress: string, vaultBalance: BigDecimal, snapshotTimestampMs: bigint): Promise<BigDecimal> {
    vaultAddress = getAddress(vaultAddress)

    // Gets closest vault token price +/- 1 day
    const iterator = ctx.store.listIterator(LyraVaultTokenPrice, [
        { field: "vaultAddress", op: "=", value: vaultAddress },
        { field: "timestampMs", op: "<=", value: snapshotTimestampMs + BigInt(MILLISECONDS_PER_DAY) },
        { field: "timestampMs", op: ">=", value: snapshotTimestampMs - BigInt(MILLISECONDS_PER_DAY) }
    ])

    let tokenPriceWithinBounds: LyraVaultTokenPrice | undefined;
    for await (const tokenPrice of iterator) {
        tokenPriceWithinBounds = tokenPrice
        break
    }
    // handle the last batch
    if (!tokenPriceWithinBounds) {
        console.log(`Could not find token price near ${snapshotTimestampMs} for ${vaultAddress}`)
        return BigDecimal(1)
    }
    return tokenPriceWithinBounds.vaultToUnderlying.multipliedBy(vaultBalance)
}