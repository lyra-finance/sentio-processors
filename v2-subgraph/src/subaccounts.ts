import {
  BalanceAdjusted as BalanceAdjustedEvent
} from "../generated/subaccounts/SubAccounts"
import { BalanceAdjusted, SubAccountBalance, SubAccount, Asset } from "../generated/schema"
import { decodeHashWithEthers}  from "./utils"
import { BigInt,Bytes, BigDecimal } from '@graphprotocol/graph-ts';

const ONE = BigDecimal.fromString('1000000000000000000')

export function handleBalanceAdjusted(event: BalanceAdjustedEvent): void {
  let subaccountId = event.params.accountId.toString()
  let assetId = event.params.assetAndSubId

  // Handle User entity
  let subaccount = SubAccount.load(subaccountId)
  if (subaccount == null) {
    subaccount = new SubAccount(subaccountId)
    subaccount.save()
  }

  // Handle Asset entity
  let asset = Asset.load(assetId)
  if (asset == null) {
    asset = new Asset(assetId)
    const decodedHash = decodeHashWithEthers(event.params.assetAndSubId)
    asset.asset = decodedHash.address
    asset.subId = decodedHash.subId
    asset.save()
  }


  // Handle BalanceAdjusted entity
  let balanceAdjustedId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let balanceAdjusted = new BalanceAdjusted(balanceAdjustedId)
  balanceAdjusted.subaccount = subaccountId
  balanceAdjusted.asset = assetId
  balanceAdjusted.accountId = event.params.accountId
  balanceAdjusted.manager = event.params.manager
  balanceAdjusted.amount = event.params.amount.toBigDecimal().div(ONE)
  balanceAdjusted.preBalance = event.params.preBalance.toBigDecimal().div(ONE)
  balanceAdjusted.postBalance = event.params.postBalance.toBigDecimal().div(ONE)
  balanceAdjusted.tradeId = event.params.tradeId
  balanceAdjusted.blockNumber = event.block.number
  balanceAdjusted.blockTimestamp = event.block.timestamp
  balanceAdjusted.transactionHash = event.transaction.hash
  balanceAdjusted.save()

  // Handle UserBalance entity
  let subaccountBalanceId = subaccountId.concat(assetId.toString())
  let subaccountBalance = SubAccountBalance.load(subaccountBalanceId)
  
  if (subaccountBalance == null) {
    subaccountBalance = new SubAccountBalance(subaccountBalanceId)
    subaccountBalance.subaccount = subaccountId
    subaccountBalance.asset = assetId
  }

  subaccountBalance.balance = balanceAdjusted.postBalance
  subaccountBalance.lastUpdated = event.block.timestamp
  subaccountBalance.save()
}