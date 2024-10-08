import {
  BalanceAdjusted as BalanceAdjustedEvent,
  AccountCreated as AccountCreatedEvent
} from "../generated/subaccounts/SubAccounts"
import { BalanceAdjusted, SubAccountBalance, SubAccount, Asset, Account, AssetContract, Currency } from "../generated/schema"
import { decodeHashWithEthers, getOptionDetails}  from "./utils"
import { BigInt,Bytes, BigDecimal, json } from '@graphprotocol/graph-ts';

const ONE = BigDecimal.fromString('1000000000000000000')
const addresses = json.fromString('{{{ import content from addresses.json }}}')


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
    asset = handleNewAsset(assetId)
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

export function handleAccountCreated(event: AccountCreatedEvent): void {
  let accountId = event.params.owner
  let subaccountId = event.params.accountId.toString()

  // Create or load Account entity. If it doesnt exist, its an EOA
  let account = Account.load(accountId)
  if (account == null) {
    account = new Account(accountId)
    account.save()
  }

  // Create SubAccount entity
  let subaccount = new SubAccount(subaccountId)
  subaccount.owner = accountId
  subaccount.save()
}


function handleNewAsset(assetId: Bytes): Asset {
  let asset = new Asset(assetId)
  const decodedHash = decodeHashWithEthers(assetId)

  let assetContract = AssetContract.load(decodedHash.address)
  if (assetContract == null) {
    assetContract = handleNewAssetContract(decodedHash.address)
  }

  if (assetContract.type == 'Option') {
    
    let optionDetails = getOptionDetails(decodedHash.subId)
    asset.name = assetContract.currency + '-' + optionDetails.name
    asset.expiry = optionDetails.expiry
    asset.strike = optionDetails.strike.toI32()
    asset.isCall = optionDetails.isCall
  } else if (assetContract.type == 'Perp') {
    asset.name = assetContract.currency + '-Perp'
  } else if (assetContract.type == 'Spot') {
    asset.name = assetContract.currency
  } else {
    asset.name = assetContract.currency
  }

  asset.assetContract = assetContract.id
  asset.subId = decodedHash.subId
  asset.save()

  return asset
}

function handleNewAssetContract(assetId: string): AssetContract {
  let assetContract = new AssetContract(assetId)
  assetContract.address = assetId

  let assetInfo = addresses.toObject().get(assetId)
  if (assetInfo) {
    let assetInfoObj = assetInfo.toObject()
    let currencyValue = assetInfoObj.get('currency')
    let typeValue = assetInfoObj.get('type')
    assert(currencyValue != null, 'Currency value is null')
    assert(typeValue != null, 'Type value is null')

    if (currencyValue) {
      let currency = Currency.load(currencyValue.toString())
      if (currency == null) {
        currency = new Currency(currencyValue.toString())
        currency.save()
      }
      assetContract.currency = currencyValue.toString()
    }else{
    let currency = Currency.load('Unknown')
    if (currency == null) {
      currency = new Currency('Unknown')
      currency.save()
    }
    assetContract.currency = currency.id
    }

    if (typeValue) {
      let typeString = typeValue.toString().toLowerCase()
      if (typeString === 'option') {
        assetContract.type = 'Option'
      } else if (typeString === 'perp') {
        assetContract.type = 'Perp'
      } else if (typeString === 'spot') {
        assetContract.type = 'Spot'
      } else {
        assetContract.type = 'Unknown'
      }
    }else{
      assetContract.type = 'Unknown'
    }
  }else{
    assetContract.type = 'Unknown'
    let currency = Currency.load('Unknown')
    if (currency == null) {
      currency = new Currency('Unknown')
      currency.save()
    }
    assetContract.currency = currency.id
  }

  assetContract.save()

  return assetContract
}