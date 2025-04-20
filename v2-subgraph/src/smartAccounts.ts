import {
  AccountDeployed as AccountDeployedEvent
} from "../generated/AccountFactory/EntryPoint"
import { LightAccount as LightAccountContract, OwnershipTransferred } from "../generated/templates/LightAccount/LightAccount"
import { BigInt, Bytes, BigDecimal } from '@graphprotocol/graph-ts';
import { Account } from "../generated/schema"
import { LightAccount } from "../generated/templates"

export function handleAccountDeployed(event: AccountDeployedEvent): void {
  // Create a new LightAccount data source template
  LightAccount.create(event.params.sender)

  let lightAccount = LightAccountContract.bind(event.params.sender)

  let owner = lightAccount.owner()

  let account = new Account(event.params.sender.toHexString())
  account.owner = owner.toHexString()
  account.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  // Update the owner of the Account
  let accountId = event.address.toHexString()
  let account = Account.load(accountId)

  if (account) {
    account.owner = event.params.newOwner.toHexString()
    account.save()
  } else {
    account = new Account(accountId)
    account.owner = event.params.newOwner.toHexString()
    account.save()
  }
}