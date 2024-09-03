import { EthChainId, EthContext, isNullAddress } from "@sentio/sdk/eth";
import { erc20 } from "@sentio/sdk/eth/builtin";
import { LyraVaultUserSnapshot } from "../schema/store.js";
import { BABYLON_POINTS_PER_DAY, LOMBARD_POINTS_PER_DAY, LYRA_VAULTS, MILLISECONDS_PER_DAY, VaultName } from "../config.js";
import { toUnderlyingBalance } from "./vaultTokenPrice.js";
import { getAddress } from "ethers";

export async function updateUserSnapshotAndEmitPointUpdate(ctx: EthContext, vaultName: keyof typeof LYRA_VAULTS, vaultTokenAddress: string, owner: string) {
    let [oldSnapshot, newSnapshot] = await updateLyraVaultUserSnapshot(ctx, vaultName, vaultTokenAddress, owner)
    emitUserPointUpdate(ctx, oldSnapshot, newSnapshot)
}

export async function updateLyraVaultUserSnapshot(ctx: EthContext, vaultName: keyof typeof LYRA_VAULTS, vaultTokenAddress: string, owner: string): Promise<[LyraVaultUserSnapshot?, LyraVaultUserSnapshot?]> {
    vaultTokenAddress = getAddress(vaultTokenAddress)

    if (isNullAddress(owner)) return [undefined, undefined];

    const vaultTokenContractView = erc20.getERC20ContractOnContext(ctx, vaultTokenAddress)
    let currentTimestampMs = BigInt(ctx.timestamp.getTime())
    let currentShareBalance = (await vaultTokenContractView.balanceOf(owner)).scaleDown(18)
    let underlyingBalance = await toUnderlyingBalance(ctx, LYRA_VAULTS[vaultName].lyra, currentShareBalance, currentTimestampMs)

    let lastSnapshot = await ctx.store.get(LyraVaultUserSnapshot, `${owner}-${vaultTokenAddress}`)

    if (lastSnapshot) {
        // deep clone to avoid mutation
        lastSnapshot = new LyraVaultUserSnapshot({
            id: lastSnapshot.id,
            owner: lastSnapshot.owner,
            vaultName: lastSnapshot.vaultName,
            vaultAddress: lastSnapshot.vaultAddress,
            timestampMs: lastSnapshot.timestampMs,
            vaultBalance: lastSnapshot.vaultBalance,
            underlyingEffectiveBalance: lastSnapshot.underlyingEffectiveBalance
        })
    }

    let newSnapshot = new LyraVaultUserSnapshot(
        {
            id: `${owner}-${vaultTokenAddress}`,
            owner: owner,
            vaultName: vaultName.toString(),
            vaultAddress: vaultTokenAddress,
            timestampMs: currentTimestampMs,
            vaultBalance: currentShareBalance,
            underlyingEffectiveBalance: underlyingBalance
        }
    )

    await ctx.store.upsert(newSnapshot)

    return [lastSnapshot, newSnapshot]
}

export function emitUserPointUpdate(ctx: EthContext, lastSnapshot: LyraVaultUserSnapshot | undefined, newSnapshot: LyraVaultUserSnapshot | undefined) {
    if (!lastSnapshot || !newSnapshot) return;

    if (lastSnapshot.vaultBalance.isZero()) return;

    const elapsedDays = (Number(newSnapshot.timestampMs) - Number(lastSnapshot.timestampMs)) / MILLISECONDS_PER_DAY
    const earnedEtherfiPoints = elapsedDays * LOMBARD_POINTS_PER_DAY * lastSnapshot.underlyingEffectiveBalance.toNumber()
    const earnedEigenlayerPoints = elapsedDays * BABYLON_POINTS_PER_DAY * lastSnapshot.underlyingEffectiveBalance.toNumber()
    ctx.eventLogger.emit("point_update", {
        account: lastSnapshot.owner,
        vaultAddress: lastSnapshot.vaultAddress,
        earnedEtherfiPoints: earnedEtherfiPoints,
        earnedEigenlayerPoints: earnedEigenlayerPoints,
        // last snapshot
        lastTimestampMs: lastSnapshot.timestampMs,
        lastVaultBalance: lastSnapshot.vaultBalance,
        lastunderlyingEffectiveBalance: lastSnapshot.underlyingEffectiveBalance,
        // new snapshot
        newTimestampMs: newSnapshot.timestampMs,
        newVaultBalance: newSnapshot.vaultBalance,
        newunderlyingEffectiveBalance: newSnapshot.underlyingEffectiveBalance,
        // testnet vs prod
        is_mainnet: ctx.chainId === EthChainId.ETHEREUM,
    });
}
