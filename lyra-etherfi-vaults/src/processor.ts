import { BaseContext, Counter } from '@sentio/sdk'
import { EthChainId, EthContext, isNullAddress } from '@sentio/sdk/eth'
import { ERC20Processor, erc20 } from '@sentio/sdk/eth/builtin'
import { weETHC_MAINNET, weETHCS_MAINNET } from '../src/config.js'
import { token } from "@sentio/sdk/utils"
import { LyraVaultUserSnapshot } from './schema/store.js'

const tokenCounter = Counter.register('token')

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
    await updateLyraVaultUserSnapshot(ctx, event.address, event.args.from)
    await updateLyraVaultUserSnapshot(ctx, event.address, event.args.to)
  })
  .onTimeInterval(async (_, ctx) => {
    const userSnapshots = await ctx.store.list(LyraVaultUserSnapshot, []);
    console.log("on time interval get ", JSON.stringify(userSnapshots));

    try {
      const promises = [];
      for (const snapshot of userSnapshots) {
        promises.push(
          updateLyraVaultUserSnapshot(ctx, snapshot.vaultAddress, snapshot.owner)
        );
      }
      await Promise.all(promises);
    } catch (e) {
      console.log("onTimeInterval error", e.message, ctx.timestamp);
    }
  },
    60,
    60 * 24
  ) // what does this backfill param mean? 

// async function handleEvent

async function updateLyraVaultUserSnapshot(ctx: EthContext, vaultTokenAddress: string, owner: string) {
  if (isNullAddress(owner)) return;

  const vaultTokenContractView = erc20.getERC20Contract(EthChainId.ETHEREUM, vaultTokenAddress)
  let currentBalance = (await vaultTokenContractView.balanceOf(owner)).scaleDown(18)

  let latestLyraVaultUserSnapshot = new LyraVaultUserSnapshot(
    {
      id: `${owner}-${vaultTokenAddress}`,
      owner: owner,
      vaultAddress: vaultTokenAddress,
      timestampMilli: BigInt(ctx.timestamp.getTime()),
      vaultBalance: currentBalance,
      lbtcEffectiveBalance: currentBalance // for now assumes 1:1 weETH - weETH<LYRA_VAULT>
    }
  )

  await ctx.store.upsert(latestLyraVaultUserSnapshot)
}