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

    const vaultTokenContractView = erc20.getERC20Contract(EthChainId.ETHEREUM, vaultTokenAddress)
    let currentBalance = (await vaultTokenContractView.balanceOf(owner)).scaleDown(18)

    let oldLyraVaultUserSnapshot = await ctx.store.get(LyraVaultUserSnapshot, `${owner}-${vaultTokenAddress}`)

    let newLyraVaultUserSnapshot = new LyraVaultUserSnapshot(
        {
            id: `${owner}-${vaultTokenAddress}`,
            owner: owner,
            vaultAddress: vaultTokenAddress,
            timestampMilli: BigInt(ctx.timestamp.getTime()),
            vaultBalance: currentBalance,
            weETHEffectiveBalance: currentBalance // for now assumes 1:1 weETH - weETH<LYRA_VAULT>
        }
    )

    await ctx.store.upsert(newLyraVaultUserSnapshot)

    return [oldLyraVaultUserSnapshot, newLyraVaultUserSnapshot]
}

export function emitUserPointUpdate(ctx: EthContext, lastSnapshot: LyraVaultUserSnapshot | undefined, newSnapshot: LyraVaultUserSnapshot | undefined) {
    if (!lastSnapshot || !newSnapshot) return;

    if (lastSnapshot.vaultBalance.isZero()) return;

    console.log("Found last snapshot with non zero balance for ", lastSnapshot.owner, lastSnapshot.vaultAddress)
    const elapsedDays = (Number(newSnapshot.timestampMilli) - Number(lastSnapshot.timestampMilli)) / MILLISECONDS_PER_DAY
    const earnedEtherfiPoints = elapsedDays * ETHERFI_POINTS_PER_DAY * lastSnapshot.weETHEffectiveBalance.toNumber()
    const earnedEigenlayerPoints = elapsedDays * EIGENLAYER_POINTS_PER_DAY * lastSnapshot.weETHEffectiveBalance.toNumber()
    ctx.eventLogger.emit("point_update", {
        account: lastSnapshot.owner,
        vaultAddress: lastSnapshot.vaultAddress,
        earnedEtherfiPoints: earnedEtherfiPoints,
        earnedEigenlayerPoints: earnedEigenlayerPoints,
        // last snapshot
        lastTimestampMs: Number(lastSnapshot.timestampMilli),
        lastVaultBalance: lastSnapshot.vaultBalance.toString(),
        lastweETHEffectiveBalance: lastSnapshot.weETHEffectiveBalance.toString(),
        // new snapshot
        newTimestampMs: Number(newSnapshot.timestampMilli),
        newVaultBalance: newSnapshot.vaultBalance.toString(),
        newweETHEffectiveBalance: newSnapshot.weETHEffectiveBalance.toString(),
    });
}