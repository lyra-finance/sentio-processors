import {
    AccountDeployed as AccountDeployedEvent
  } from "../generated/AccountFactory/EntryPoint"
  import { OwnershipTransferred } from "../generated/templates/LightAccount/LightAccount"
  import { BigInt,Bytes, BigDecimal } from '@graphprotocol/graph-ts';
  import { Account, SubAccount } from "../generated/schema"
  import { LightAccount } from "../generated/templates"

  export function handleAccountDeployed(event: AccountDeployedEvent): void {
    // Create a new Account entity
    let account = new Account(event.params.sender)
    account.owner = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
    account.save()

    // Create a new LightAccount data source template
    LightAccount.create(event.params.sender)
  }

  export function handleOwnershipTransferred(event: OwnershipTransferred): void {
    // Update the owner of the Account
    let accountId = event.address
    let account = Account.load(accountId)
    
    if (account) {
      account.owner = event.params.newOwner
      account.save()
    }
  }