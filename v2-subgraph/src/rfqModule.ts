import { RFQTradeCompleted as RFQTradeCompletedEvent } from "../generated/RFQModule/RFQModule"
import { Trade, SubAccount, Asset } from "../generated/schema"
import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { handleNewAsset, ONE } from "./utils"

export function handleRFQTradeCompleted(event: RFQTradeCompletedEvent): void {
  // Load or create maker and taker subaccounts
  let makerId = event.params.maker.toString()
  let takerId = event.params.taker.toString()
  let maker = SubAccount.load(makerId)
  let taker = SubAccount.load(takerId)

  if (!taker || !maker) {
    throw new Error("Taker or maker subaccount not found")
  }

  // Assuming the first trade in the array is the main trade we're interested in
  
  for (let i = 0; i < event.params.trades.length; i++) {
    let tradeData = event.params.trades[i]
    let tradeId = event.transaction.hash.concatI32(event.logIndex.toI32()).concatI32(i)
    let trade = new Trade(tradeId)

    // Load or create the asset
    let assetId = tradeData.asset.concat(Bytes.fromByteArray(Bytes.fromBigInt(tradeData.subId)))
    let asset = Asset.load(assetId.toHexString())
    if (!asset) {
        asset = handleNewAsset(assetId)
    }

    trade.base = asset.id
    trade.taker = taker.id
    trade.maker = maker.id
    trade.takerIsBid = tradeData.baseAmt.gt(BigInt.fromI32(0))
    trade.amountQuote = tradeData.quoteAmt.abs().toBigDecimal().div(ONE)
    trade.amountBase = tradeData.baseAmt.abs().toBigDecimal().div(ONE)
    trade.blockNumber = event.block.number
    trade.blockTimestamp = event.block.timestamp
    trade.transactionHash = event.transaction.hash.toHexString()
    trade.isRFQ = true

    trade.save()
  }
}