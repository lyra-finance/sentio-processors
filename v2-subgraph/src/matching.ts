import {
    DepositedSubAccount as DepositedSubAccountEvent,
    WithdrewSubAccount as WithdrewSubAccountEvent
  } from "../generated/matching/Matching"
  import { SubAccount, Account } from "../generated/schema"
  
  export function handleDepositedSubAccount(event: DepositedSubAccountEvent): void {
    let subaccountId = event.params.accountId.toString()
    let subaccount = SubAccount.load(subaccountId)
  
    if (subaccount) {
      // Check if the Account exists
      let accountId = event.params.owner.toHexString()
      let account = Account.load(accountId)
  
      // If the Account doesn't exist, create it
      if (!account) {
        account = new Account(accountId)
        account.save()
      }
  
      subaccount.matchingOwner = account.id
      subaccount.save()
    }
  }
  
  export function handleWithdrewSubAccount(event: WithdrewSubAccountEvent): void {
    let subaccountId = event.params.accountId.toString()
    let subaccount = SubAccount.load(subaccountId)
  
    if (subaccount) {
      subaccount.matchingOwner = null
      subaccount.save()
    }
  }