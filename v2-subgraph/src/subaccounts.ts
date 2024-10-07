import {
  BalanceAdjusted as BalanceAdjustedEvent
} from "../generated/subaccounts/SubAccounts"
import { BalanceAdjusted } from "../generated/schema"

export function handleBalanceAdjusted(event: BalanceAdjustedEvent): void {
  let entity = new BalanceAdjusted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.accountId = event.params.accountId
  entity.manager = event.params.manager
  entity.assetAndSubId = event.params.assetAndSubId
  entity.amount = event.params.amount
  entity.preBalance = event.params.preBalance
  entity.postBalance = event.params.postBalance
  entity.tradeId = event.params.tradeId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}