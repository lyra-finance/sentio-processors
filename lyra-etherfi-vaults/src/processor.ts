import { EthChainId } from '@sentio/sdk/eth'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { LYRA_VAULTS } from '../src/config.js'
import { LyraVaultUserSnapshot } from '../src/schema/store.js'
import { updateUserSnapshotAndEmitPointUpdate } from './utils/userSnapshotsAndPoints.js'
import { LyraVaultTokenProcessor } from './types/eth/lyravaulttoken.js'
import { saveCurrentVaultTokenPrice } from './utils/vaultTokenPrice.js'

/////////////////
// Methodology //
/////////////////


// Snapshots
// - At every transfer event or time interval, we save the latest `LyraVaultUserSnapshot` of a user in `sentio.ctx.store`
// - For each token, once per day store `LyraVaultTokenPrice` price in terms of LBTC / dollars (TODO: Lyra chain not supported yet, assume 1:1)

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
  // attach to weETHC_MAINNET as it's the oldest vault
  .onTimeInterval(async (_, ctx) => {
    const userSnapshots: LyraVaultUserSnapshot[] = await ctx.store.list(LyraVaultUserSnapshot, []);

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
    60,
    60 * 4 // backfill at 4 hour intervals
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

// NOTE: Overriding BITLAYER as LYRA CHAIN in sentio.yaml
LyraVaultTokenProcessor.bind(
  { address: LYRA_VAULTS.WETHC.lyra, network: EthChainId.BITLAYER }
)
  .onTimeInterval(async (_, ctx) => {
    await saveCurrentVaultTokenPrice(ctx, ctx.address, LYRA_VAULTS.WETHC.predepositUpgradeTimestampMs)
  },
    60 * 24,
    60 * 24
  )

LyraVaultTokenProcessor.bind(
  { address: LYRA_VAULTS.WETHCS.lyra, network: EthChainId.BITLAYER }
)
  .onTimeInterval(async (_, ctx) => {
    await saveCurrentVaultTokenPrice(ctx, ctx.address, LYRA_VAULTS.WETHCS.predepositUpgradeTimestampMs)
  },
    60 * 24,
    60 * 24
  )

LyraVaultTokenProcessor.bind(
  { address: LYRA_VAULTS.WETHBULL.lyra, network: EthChainId.BITLAYER }
)
  .onTimeInterval(async (_, ctx) => {
    await saveCurrentVaultTokenPrice(ctx, ctx.address, LYRA_VAULTS.WETHBULL.predepositUpgradeTimestampMs)
  },
    60 * 24,
    60 * 24
  )