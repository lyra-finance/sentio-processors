import { EthChainId } from '@sentio/sdk/eth'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { LYRA_VAULTS, MAINNET_VAULT_PRICE_START_BLOCK, OP_SEPOLIA_VAULT_PRICE_START_BLOCK, VaultName } from '../src/config.js'
import { LyraVaultUserSnapshot } from '../src/schema/store.js'
import { updateUserSnapshotAndEmitPointUpdate } from './utils/userSnapshotsAndPoints.js'
import { saveCurrentVaultTokenPrice } from './utils/vaultTokenPrice.js'
import { GlobalProcessor } from '@sentio/sdk/eth'

/////////////////
// Methodology //
/////////////////


// Snapshots
// - At every transfer event or time interval, we save the latest `LyraVaultUserSnapshot` of a user in `sentio.ctx.store`
// - For each token, once per day store `LyraVaultTokenPrice` price

// Events
// 3. At every transfer event or time interval, we emit a `point_update` event which saves the points earned by user for the last hour



/////////////////////////////////
// Mainnet or OP Sepolia Binds //
/////////////////////////////////

for (const params of [
  LYRA_VAULTS.LBTCPS,
  LYRA_VAULTS.LBTCPS_TESTNET,
]) {
  ERC20Processor.bind(
    { address: params.mainnet_or_opsep, network: params.destinationChainId }
  )
    .onEventTransfer(async (event, ctx) => {
      for (const user of [event.args.from, event.args.to]) {
        await updateUserSnapshotAndEmitPointUpdate(ctx, params.vaultName, ctx.address, user)
      }
    })
    // this time interval handles all three vaults (weETHC, weETHCS, weETHBULL)
    .onTimeInterval(async (_, ctx) => {
      const userSnapshots: LyraVaultUserSnapshot[] = await ctx.store.list(LyraVaultUserSnapshot, []);

      try {
        const promises = [];
        for (const snapshot of userSnapshots) {
          promises.push(
            await updateUserSnapshotAndEmitPointUpdate(ctx, snapshot.vaultName as VaultName, snapshot.vaultAddress, snapshot.owner)
          );
        }
        await Promise.all(promises);
      } catch (e) {
        console.log("onTimeInterval error", e.message, ctx.timestamp);
      }
    },
      60 * 24,
      60 * 24 // backfill at 1 day
    )
}


for (const params of [
  LYRA_VAULTS.LBTCCS,
  LYRA_VAULTS.LBTCCS_TESTNET,
]) {
  ERC20Processor.bind({ address: params.mainnet_or_opsep, network: params.destinationChainId })
    .onEventTransfer(async (event, ctx) => {
      for (const user of [event.args.from, event.args.to]) {
        await updateUserSnapshotAndEmitPointUpdate(ctx, params.vaultName, ctx.address, user)
      }
    })
}

////////////////////////////////////////
// Lyra Chain Vault Token Price Binds //
////////////////////////////////////////
for (const params of [
  { network: EthChainId.ETHEREUM, startBlock: MAINNET_VAULT_PRICE_START_BLOCK },
  { network: EthChainId.BOB, startBlock: OP_SEPOLIA_VAULT_PRICE_START_BLOCK },
]) {

  GlobalProcessor.bind(
    params
  ).onTimeInterval(async (_, ctx) => {
    if (params.network === EthChainId.ETHEREUM) {
      await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.LBTCPS.deriveChainId, LYRA_VAULTS.LBTCPS.lyra, LYRA_VAULTS.LBTCPS.predepositUpgradeTimestampMs)
      await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.LBTCCS.deriveChainId, LYRA_VAULTS.LBTCCS.lyra, LYRA_VAULTS.LBTCCS.predepositUpgradeTimestampMs)
    } else {
      await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.LBTCPS_TESTNET.deriveChainId, LYRA_VAULTS.LBTCPS_TESTNET.lyra, LYRA_VAULTS.LBTCPS_TESTNET.predepositUpgradeTimestampMs)
      await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.LBTCCS_TESTNET.deriveChainId, LYRA_VAULTS.LBTCCS_TESTNET.lyra, LYRA_VAULTS.LBTCCS_TESTNET.predepositUpgradeTimestampMs)
    }
  },
    60 * 24,
    60 * 24
  )
}