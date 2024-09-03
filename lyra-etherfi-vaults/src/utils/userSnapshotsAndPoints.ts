import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import { erc20 } from "@sentio/sdk/eth/builtin";
import { DeriveVaultUserSnapshot } from "../schema/store.js";
import { EIGENLAYER_POINTS_PER_DAY, ETHERFI_POINTS_PER_DAY, LYRA_VAULTS, MILLISECONDS_PER_DAY } from "../config.js";
import { toUnderlyingBalance } from "./vaultTokenPrice.js";
import { getAddress } from "ethers";

export async function updateUserSnapshotAndEmitPointUpdate(ctx: EthContext, vaultName: string, vaultTokenAddress: string, owner: string) {
    let [oldSnapshot, newSnapshot] = await updateDeriveVaultUserSnapshot(ctx, vaultName, vaultTokenAddress, owner)
    emitUserPointUpdate(ctx, oldSnapshot, newSnapshot)
}

export async function updateDeriveVaultUserSnapshot(ctx: EthContext, vaultName: keyof typeof LYRA_VAULTS, vaultTokenAddress: string, owner: string): Promise<[DeriveVaultUserSnapshot?, DeriveVaultUserSnapshot?]> {
    vaultTokenAddress = getAddress(vaultTokenAddress)

    if (isNullAddress(owner)) return [undefined, undefined];

    const vaultTokenContractView = erc20.getERC20ContractOnContext(ctx, vaultTokenAddress)
    let currentTimestampMs = BigInt(ctx.timestamp.getTime())
    let currentShareBalance = (await vaultTokenContractView.balanceOf(owner)).scaleDown(18)
    let underlyingBalance = await toUnderlyingBalance(ctx, LYRA_VAULTS[vaultName].lyra, currentShareBalance, currentTimestampMs)

    let lastSnapshot = await ctx.store.get(DeriveVaultUserSnapshot, `${owner}-${vaultTokenAddress}`)

    if (lastSnapshot) {
        // deep clone to avoid mutation
        lastSnapshot = new DeriveVaultUserSnapshot({
            id: lastSnapshot.id,
            owner: lastSnapshot.owner,
            vaultName: lastSnapshot.vaultName,
            vaultAddress: lastSnapshot.vaultAddress,
            timestampMs: lastSnapshot.timestampMs,
            vaultBalance: lastSnapshot.vaultBalance,
            weETHEffectiveBalance: lastSnapshot.weETHEffectiveBalance
        })
    }

    let newSnapshot = new DeriveVaultUserSnapshot(
        {
            id: `${owner}-${vaultTokenAddress}`,
            owner: owner,
            vaultName: vaultName,
            vaultAddress: vaultTokenAddress,
            timestampMs: currentTimestampMs,
            vaultBalance: currentShareBalance,
            weETHEffectiveBalance: underlyingBalance
        }
    )

    await ctx.store.upsert(newSnapshot)

    return [lastSnapshot, newSnapshot]
}

export function emitUserPointUpdate(ctx: EthContext, lastSnapshot: DeriveVaultUserSnapshot | undefined, newSnapshot: DeriveVaultUserSnapshot | undefined) {
    if (!lastSnapshot || !newSnapshot) return;

    if (lastSnapshot.vaultBalance.isZero()) return;

    const elapsedDays = (Number(newSnapshot.timestampMs) - Number(lastSnapshot.timestampMs)) / MILLISECONDS_PER_DAY
    const earnedEtherfiPoints = elapsedDays * ETHERFI_POINTS_PER_DAY * lastSnapshot.weETHEffectiveBalance.toNumber()
    const earnedEigenlayerPoints = elapsedDays * EIGENLAYER_POINTS_PER_DAY * lastSnapshot.weETHEffectiveBalance.toNumber()
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
