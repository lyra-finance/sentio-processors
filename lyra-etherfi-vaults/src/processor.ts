import { EthChainId } from '@sentio/sdk/eth'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { ARB_VAULT_PRICE_START_BLOCK, LYRA_VAULTS, MAINNET_VAULT_PRICE_START_BLOCK } from '../src/config.js'
import { DeriveVaultUserSnapshot } from '../src/schema/store.js'
import { updateUserSnapshotAndEmitPointUpdate } from './utils/userSnapshotsAndPoints.js'
import { saveCurrentVaultTokenPrice } from './utils/vaultTokenPrice.js'
import { GlobalProcessor } from '@sentio/sdk/eth'

/////////////////
// Methodology //
/////////////////


// Snapshots
// - At every transfer event or time interval, we save the latest `DeriveVaultUserSnapshot` of a user in `sentio.ctx.store`
// - For each token, once per day store `DeriveVaultTokenPrice` price in terms of LBTC / dollars (TODO: Lyra chain not supported yet, assume 1:1)

// Events
// 3. At every transfer event or time interval, we emit a `point_update` event which saves the points earned by user for the last hour


///////////////////
// Mainnet Binds //
///////////////////

ERC20Processor.bind(
  { address: LYRA_VAULTS.WETHC.mainnet, network: EthChainId.ETHEREUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, "WETHC", ctx.address, user)
    }
  })
  // this time interval handles all three vaults (weETHC, weETHCS, weETHBULL)
  .onTimeInterval(async (_, ctx) => {
    const userSnapshots: DeriveVaultUserSnapshot[] = await ctx.store.list(DeriveVaultUserSnapshot, []);

    try {
      const promises = [];
      for (const snapshot of userSnapshots) {
        promises.push(
          await updateUserSnapshotAndEmitPointUpdate(ctx, snapshot.vaultName, snapshot.vaultAddress, snapshot.owner)
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

ERC20Processor.bind(
  { address: LYRA_VAULTS.WETHCS.mainnet, network: EthChainId.ETHEREUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, "WETHCS", ctx.address, user)
    }
  })

ERC20Processor.bind(
  { address: LYRA_VAULTS.WETHBULL.mainnet, network: EthChainId.ETHEREUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, "WETHBULL", ctx.address, user)
    }
  })


////////////////////
// Arbitrum Binds //
////////////////////

ERC20Processor.bind(
  { address: LYRA_VAULTS.WETHC.arb, network: EthChainId.ARBITRUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, "WETHC", ctx.address, user)
    }
  })
  // this time interval handles all three vaults (weETHC, weETHCS, weETHBULL)
  .onTimeInterval(async (_, ctx) => {
    const userSnapshots: DeriveVaultUserSnapshot[] = await ctx.store.list(DeriveVaultUserSnapshot, []);

    try {
      const promises = [];
      for (const snapshot of userSnapshots) {
        promises.push(
          await updateUserSnapshotAndEmitPointUpdate(ctx, snapshot.vaultName, snapshot.vaultAddress, snapshot.owner)
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

ERC20Processor.bind(
  { address: LYRA_VAULTS.WETHCS.arb, network: EthChainId.ARBITRUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, "WETHCS", ctx.address, user)
    }
  })

ERC20Processor.bind(
  { address: LYRA_VAULTS.WETHBULL.arb, network: EthChainId.ARBITRUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, "WETHBULL", ctx.address, user)
    }
  })


////////////////////////////////////////
// Lyra Chain Vault Token Price Binds //
////////////////////////////////////////

GlobalProcessor.bind(
  { network: EthChainId.ARBITRUM, startBlock: ARB_VAULT_PRICE_START_BLOCK }
).onTimeInterval(async (_, ctx) => {
  await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.WETHC.lyra, LYRA_VAULTS.WETHC.predepositUpgradeTimestampMs)
  await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.WETHCS.lyra, LYRA_VAULTS.WETHCS.predepositUpgradeTimestampMs)
  await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.WETHBULL.lyra, LYRA_VAULTS.WETHBULL.predepositUpgradeTimestampMs)
},
  60 * 24,
  60 * 24
)

GlobalProcessor.bind(
  { network: EthChainId.ETHEREUM, startBlock: MAINNET_VAULT_PRICE_START_BLOCK }
).onTimeInterval(async (_, ctx) => {
  await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.WETHC.lyra, LYRA_VAULTS.WETHC.predepositUpgradeTimestampMs)
  await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.WETHCS.lyra, LYRA_VAULTS.WETHCS.predepositUpgradeTimestampMs)
  await saveCurrentVaultTokenPrice(ctx, LYRA_VAULTS.WETHBULL.lyra, LYRA_VAULTS.WETHBULL.predepositUpgradeTimestampMs)
},
  60 * 24,
  60 * 24
)