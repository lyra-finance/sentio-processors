import { EthContext } from "@sentio/sdk/eth"
import { LyraVaultTokenPrice } from "../schema/store.js"
import { getLyraVaultTokenContractOnContext } from "../types/eth/lyravaulttoken.js"
import { MILLISECONDS_PER_DAY } from "../config.js"
import { BigDecimal } from "@sentio/sdk"

export async function saveCurrentVaultTokenPrice(ctx: EthContext, vaultTokenAddress: string) {
    // This is taken exclusively from the Lyra Chain
    const vaultTokenContract = getLyraVaultTokenContractOnContext(ctx, vaultTokenAddress)
    const shareToUnderlying = (await vaultTokenContract.getSharesValue(1e18)).scaleDown(18)
    const nowMs = BigInt(ctx.timestamp.getTime())

    ctx.store.upsert(new LyraVaultTokenPrice({
        id: `${vaultTokenAddress}-${nowMs}`,
        vaultAddress: vaultTokenAddress,
        timestampMs: nowMs,
        vaultToUnderlying: shareToUnderlying
    }))
}

export async function toUnderlyingBalance(ctx: EthContext, vaultAddress: string, vaultBalance: BigDecimal, snapshotTimestampMs: bigint): Promise<BigDecimal> {
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