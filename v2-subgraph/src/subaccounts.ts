import {
  BalanceAdjusted as BalanceAdjustedEvent,
  Transfer as TransferEvent
} from "../generated/subaccounts/SubAccounts"
import { BalanceAdjusted, SubAccountBalance, SubAccount, Asset, Account } from "../generated/schema"
import { handleNewAsset, ONE } from "./utils"
import {log} from '@graphprotocol/graph-ts'



export function handleBalanceAdjusted(event: BalanceAdjustedEvent): void {
  let subaccountId = event.params.accountId.toString()
  let assetId = event.params.assetAndSubId

  let assetHex = assetId.toHexString()

  // Handle User entity
  let subaccount = SubAccount.load(subaccountId)
  if (subaccount == null) {
    subaccount = new SubAccount(subaccountId)
    subaccount.subaccountId = event.params.accountId
    subaccount.save()
  }

  // Handle Asset entity
  let asset = Asset.load(assetHex)
  if (asset == null) {
    asset = handleNewAsset(assetId)
  }


  // Handle BalanceAdjusted entity
  let balanceAdjustedId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let balanceAdjusted = new BalanceAdjusted(balanceAdjustedId)
  balanceAdjusted.subaccount = subaccountId
  balanceAdjusted.asset = assetHex
  balanceAdjusted.accountId = event.params.accountId
  balanceAdjusted.manager = event.params.manager.toHexString()
  balanceAdjusted.amount = event.params.amount.toBigDecimal().div(ONE)
  balanceAdjusted.preBalance = event.params.preBalance.toBigDecimal().div(ONE)
  balanceAdjusted.postBalance = event.params.postBalance.toBigDecimal().div(ONE)
  balanceAdjusted.tradeId = event.params.tradeId
  balanceAdjusted.blockNumber = event.block.number
  balanceAdjusted.blockTimestamp = event.block.timestamp
  balanceAdjusted.transactionHash = event.transaction.hash.toHexString()
  balanceAdjusted.save()

  // Handle UserBalance entity
  let subaccountBalanceId = subaccountId.concat(assetHex)
  let subaccountBalance = SubAccountBalance.load(subaccountBalanceId)

  if (subaccountBalance == null) {
    subaccountBalance = new SubAccountBalance(subaccountBalanceId)
    subaccountBalance.subaccount = subaccountId
    subaccountBalance.asset = assetHex
  }

  subaccountBalance.balance = balanceAdjusted.postBalance
  subaccountBalance.lastUpdated = event.block.timestamp
  subaccountBalance.save()
}

// export function handleAccountCreated(event: AccountCreatedEvent): void {
//   let accountId = event.params.owner
//   let subaccountId = event.params.accountId.toString()

//   // Create or load Account entity. If it doesnt exist, its an EOA
//   let account = Account.load(accountId)
//   if (account == null) {
//     account = new Account(accountId)
//     account.save()
//   }

//   // Create SubAccount entity
//   let subaccount = new SubAccount(subaccountId)
//   subaccount.owner = accountId
//   subaccount.save()
// }

export function handleTransfer(event: TransferEvent): void {
  let accountId = event.params.to.toHexString()
  let subaccountId = event.params.tokenId.toString()

  // Create or load Account entity. If it doesnt exist, its an EOA
  let account = Account.load(accountId)
  if (account == null) {
    account = new Account(accountId)
    account.save()
  }

  // Create SubAccount entity
  let subaccount = SubAccount.load(subaccountId)
  if (subaccount == null) {
    subaccount = new SubAccount(subaccountId)
    subaccount.subaccountId = event.params.tokenId
    subaccount.owner = accountId
    subaccount.save()
  } else {
    subaccount.owner = accountId
    subaccount.save()
  }
}

