import { EthChainId } from '@sentio/sdk/eth'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { weETHBULL_ARBITRUM, weETHBULL_LYRACHAIN, weETHBULL_MAINNET, weETHC_ARBITRUM, weETHC_LYRACHAIN, weETHC_MAINNET, weETHCS_ARBITRUM, weETHCS_LYRACHAIN, weETHCS_MAINNET } from '../src/config.js'
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
// 2. At every transfer event or time interval, we emit a `position_snapshot` event which returns the latest vault balances and effective LBTC balance per user (TODO: TBD if Lombard needs this)
// 3. At every transfer event or time interval, we emit a `point_update` event which saves the points earned by user for the last hour


///////////////////
// Mainnet Binds //
///////////////////

ERC20Processor.bind(
  { address: weETHC_MAINNET, network: EthChainId.ETHEREUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, ctx.address, user)
    }
  })
  // this time interval handles all three vaults (weETHC, weETHCS, weETHBULL)
  // attach to weETHC_MAINNET as it's the oldest vault
  .onTimeInterval(async (_, ctx) => {
    const userSnapshots: LyraVaultUserSnapshot[] = await ctx.store.list(LyraVaultUserSnapshot, []);
    console.log(`Got ${userSnapshots.length} snapshots onTimeInterval`);

    try {
      const promises = [];
      for (const snapshot of userSnapshots) {
        promises.push(
          await updateUserSnapshotAndEmitPointUpdate(ctx, snapshot.vaultAddress, snapshot.owner)
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
  { address: weETHCS_MAINNET, network: EthChainId.ETHEREUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, ctx.address, user)
    }
  })

ERC20Processor.bind(
  { address: weETHBULL_MAINNET, network: EthChainId.ETHEREUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, ctx.address, user)
    }
  })

ERC20Processor.bind(
  { address: weETHC_ARBITRUM, network: EthChainId.ARBITRUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, ctx.address, user)
    }
  })

////////////////////
// Arbitrum Binds //
////////////////////

ERC20Processor.bind(
  { address: weETHCS_ARBITRUM, network: EthChainId.ARBITRUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, ctx.address, user)
    }
  })

ERC20Processor.bind(
  { address: weETHBULL_ARBITRUM, network: EthChainId.ARBITRUM }
)
  .onEventTransfer(async (event, ctx) => {
    for (const user of [event.args.from, event.args.to]) {
      await updateUserSnapshotAndEmitPointUpdate(ctx, ctx.address, user)
    }
  })


////////////////////////////////////////
// Lyra Chain Vault Token Price Binds //
////////////////////////////////////////

// NOTE: Overriding BITLAYER as LYRA CHAIN in sentio.yaml
LyraVaultTokenProcessor.bind(
  { address: weETHC_LYRACHAIN, network: EthChainId.BITLAYER }
)
  .onTimeInterval(async (_, ctx) => {
    await saveCurrentVaultTokenPrice(ctx, ctx.address)
  },
    60 * 24,
    60 * 24
  )

LyraVaultTokenProcessor.bind(
  { address: weETHCS_LYRACHAIN, network: EthChainId.BITLAYER }
)
  .onTimeInterval(async (_, ctx) => {
    await saveCurrentVaultTokenPrice(ctx, ctx.address)
  },
    60 * 24,
    60 * 24
  )

LyraVaultTokenProcessor.bind(
  { address: weETHBULL_LYRACHAIN, network: EthChainId.BITLAYER }
)
  .onTimeInterval(async (_, ctx) => {
    await saveCurrentVaultTokenPrice(ctx, ctx.address)
  },
    60 * 24,
    60 * 24
  )