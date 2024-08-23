import { EthChainId, EthContext, isNullAddress } from "@sentio/sdk/eth";
import { erc20 } from "@sentio/sdk/eth/builtin";
import { LyraVaultUserSnapshot } from "./schema/store.js";
import { EIGENLAYER_POINTS_PER_DAY, ETHERFI_POINTS_PER_DAY, MILLISECONDS_PER_DAY } from "./config.js";

export async function updateUserSnapshotAndEmitPointUpdate(ctx: EthContext, vaultTokenAddress: string, owner: string) {
    let [oldSnapshot, newSnapshot] = await updateLyraVaultUserSnapshot(ctx, vaultTokenAddress, owner)
    emitUserPointUpdate(ctx, oldSnapshot, newSnapshot)
}

export async function updateLyraVaultUserSnapshot(ctx: EthContext, vaultTokenAddress: string, owner: string): Promise<[LyraVaultUserSnapshot?, LyraVaultUserSnapshot?]> {
    if (isNullAddress(owner)) return [undefined, undefined];

    const vaultTokenContractView = erc20.getERC20ContractOnContext(ctx, vaultTokenAddress)
    let currentBalance = (await vaultTokenContractView.balanceOf(owner)).scaleDown(18)

    let lastSnapshot = await ctx.store.get(LyraVaultUserSnapshot, `${owner}-${vaultTokenAddress}`)

    if (lastSnapshot) {
        // deep clone to avoid mutation
        lastSnapshot = new LyraVaultUserSnapshot({
            id: lastSnapshot.id,
            owner: lastSnapshot.owner,
            vaultAddress: lastSnapshot.vaultAddress,
            timestampMs: lastSnapshot.timestampMs,
            vaultBalance: lastSnapshot.vaultBalance,
            weETHEffectiveBalance: lastSnapshot.weETHEffectiveBalance
        })
    }

    let newSnapshot = new LyraVaultUserSnapshot(
        {
            id: `${owner}-${vaultTokenAddress}`,
            owner: owner,
            vaultAddress: vaultTokenAddress,
            timestampMs: BigInt(ctx.timestamp.getTime()),
            vaultBalance: currentBalance,
            weETHEffectiveBalance: currentBalance // for now assumes 1:1 weETH - weETH<LYRA_VAULT>
        }
    )

    await ctx.store.upsert(newSnapshot)

    return [lastSnapshot, newSnapshot]
}

export function emitUserPointUpdate(ctx: EthContext, lastSnapshot: LyraVaultUserSnapshot | undefined, newSnapshot: LyraVaultUserSnapshot | undefined) {
    if (!lastSnapshot || !newSnapshot) return;

    if (lastSnapshot.vaultBalance.isZero()) return;

    const elapsedDays = (Number(newSnapshot.timestampMs) - Number(lastSnapshot.timestampMs)) / MILLISECONDS_PER_DAY
    const earnedEtherfiPoints = elapsedDays * ETHERFI_POINTS_PER_DAY * lastSnapshot.weETHEffectiveBalance.toNumber()
    const earnedEigenlayerPoints = elapsedDays * EIGENLAYER_POINTS_PER_DAY * lastSnapshot.weETHEffectiveBalance.toNumber()
    console.log("Emitting point update", {
        account: lastSnapshot.owner,
        lastTimestampMs: lastSnapshot.timestampMs,
        lastVaultBalance: lastSnapshot.vaultBalance.toString(),
        newTimestampMs: newSnapshot.timestampMs,
        newVaultBalance: newSnapshot.vaultBalance.toString(),
    });
    ctx.eventLogger.emit("point_update", {
        account: lastSnapshot.owner,
        vaultAddress: lastSnapshot.vaultAddress,
        earnedEtherfiPoints: earnedEtherfiPoints,
        earnedEigenlayerPoints: earnedEigenlayerPoints,
        // last snapshot
        lastTimestampMs: lastSnapshot.timestampMs,
        lastVaultBalance: lastSnapshot.vaultBalance,
        lastweETHEffectiveBalance: lastSnapshot.weETHEffectiveBalance,
        // new snapshot
        newTimestampMs: newSnapshot.timestampMs,
        newVaultBalance: newSnapshot.vaultBalance,
        newweETHEffectiveBalance: newSnapshot.weETHEffectiveBalance,
    });
}

export function saveVaultTokenPrice(ctx: EthContext, vaultTokenAddress: string, price: number) {
    ///
}