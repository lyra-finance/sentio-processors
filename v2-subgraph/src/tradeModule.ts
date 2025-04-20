import {
  OrderMatched as OrderMatchedEvent
} from "../generated/TradeModule/TradeModule"
import { Trade, SubAccount, Asset } from "../generated/schema"
import { handleNewAsset, ONE } from "./utils"

export function handleOrderMatched(event: OrderMatchedEvent): void {
  let tradeId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let trade = new Trade(tradeId)

  // Load or create the base Asset
  let baseAssetId = event.params.base
  // Handle Asset entity
  let asset = Asset.load(baseAssetId.toHexString())
  if (asset == null) {
    asset = handleNewAsset(baseAssetId)
  }

  // Load or create the taker SubAccount
  let takerId = event.params.taker.toString()
  let taker = SubAccount.load(takerId)
  

  // Load or create the maker SubAccount
  let makerId = event.params.maker.toString()
  let maker = SubAccount.load(makerId)

  if (!taker || !maker) {
    throw new Error("Taker or maker subaccount not found")
  }

  trade.base = asset.id
  trade.taker = taker.id
  trade.maker = maker.id
  trade.takerIsBid = event.params.takerIsBid
  trade.amountQuote = event.params.amtQuote.toBigDecimal().div(ONE)
  trade.amountBase = event.params.amtBase.toBigDecimal().div(ONE)
  trade.blockNumber = event.block.number
  trade.blockTimestamp = event.block.timestamp
  trade.transactionHash = event.transaction.hash.toHexString()
  trade.isRFQ = false

  trade.save()
}