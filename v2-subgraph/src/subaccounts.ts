import {
  BalanceAdjusted as BalanceAdjustedEvent
} from "../generated/subaccounts/SubAccounts"
import { BalanceAdjusted, UserBalance, User, Asset } from "../generated/schema"
import { decodeHashWithEthers}  from "./utils"
import { BigInt,Bytes } from '@graphprotocol/graph-ts';

const ONE = BigInt.fromString('1000000000000000000')

export function handleBalanceAdjusted(event: BalanceAdjustedEvent): void {
  let userId = event.params.manager
  let assetId = event.params.assetAndSubId

  // Handle User entity
  let user = User.load(userId)
  if (user == null) {
    user = new User(userId)
    user.save()
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
  balanceAdjusted.user = userId
  balanceAdjusted.asset = assetId
  balanceAdjusted.accountId = event.params.accountId
  balanceAdjusted.manager = event.params.manager
  balanceAdjusted.amount = event.params.amount.div(ONE)
  balanceAdjusted.preBalance = event.params.preBalance.div(ONE)
  balanceAdjusted.postBalance = event.params.postBalance.div(ONE)
  balanceAdjusted.tradeId = event.params.tradeId
  balanceAdjusted.blockNumber = event.block.number
  balanceAdjusted.blockTimestamp = event.block.timestamp
  balanceAdjusted.transactionHash = event.transaction.hash
  balanceAdjusted.save()

  // Handle UserBalance entity
  let userBalanceId = userId.concat(assetId)
  let userBalance = UserBalance.load(userBalanceId)
  
  if (userBalance == null) {
    userBalance = new UserBalance(userBalanceId)
    userBalance.user = userId
    userBalance.asset = assetId
  }

  userBalance.balance = balanceAdjusted.postBalance
  userBalance.lastUpdated = event.block.timestamp
  userBalance.save()
}