import { BaseContext, Counter } from '@sentio/sdk'
import { EthChainId, EthContext, isNullAddress } from '@sentio/sdk/eth'
import { ERC20Processor, erc20 } from '@sentio/sdk/eth/builtin'
import { weETHBULL_MAINNET, weETHC_MAINNET, weETHCS_MAINNET } from '../src/config.js'
import { LyraVaultUserSnapshot } from '../src/schema/store.js'
import { emitUserPointUpdate, updateLyraVaultUserSnapshot, updateUserSnapshotAndEmitPointUpdate } from './utils.js'

/////////////////
// Methodology //
/////////////////


// Snapshots
// - At every transfer event or time interval, we save the latest `LyraVaultUserSnapshot` of a user in `sentio.ctx.store`
// - At every time interval keep track of `LyraVaultTokenPrice` price in terms of LBTC / dollars (TODO: Lyra chain not supported yet, assume 1:1)

// Events
// 2. At every transfer event or time interval, we emit a `position_snapshot` event which returns the latest vault balances and effective LBTC balance per user
// 3. At every transfer event or time interval, we emit a `point_update` event which saves the points earned by user for the last hour

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
    console.log("on time interval get ", JSON.stringify(userSnapshots));

    try {
      const promises = [];
      for (const snapshot of userSnapshots) {
        promises.push(async () => {
          await updateUserSnapshotAndEmitPointUpdate(ctx, snapshot.vaultAddress, snapshot.owner)
        });
      }
      await Promise.all(promises);
    } catch (e) {
      console.log("onTimeInterval error", e.message, ctx.timestamp);
    }
  },
    60,
    60 * 24
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