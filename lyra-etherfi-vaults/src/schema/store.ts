
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type { String, Int, BigInt, Float, ID, Bytes, Timestamp, Boolean } from '@sentio/sdk/store'
import { Entity, Required, One, Many, Column, ListColumn, AbstractEntity } from '@sentio/sdk/store'
import { BigDecimal } from '@sentio/bigdecimal'
import { DatabaseSchema } from '@sentio/sdk'






@Entity("LyraVaultUserSnapshot")
export class LyraVaultUserSnapshot extends AbstractEntity  {

	@Required
	@Column("ID")
	id: ID

	@Required
	@Column("String")
	owner: String

	@Required
	@Column("String")
	vaultName: String

	@Required
	@Column("String")
	vaultAddress: String

	@Required
	@Column("BigInt")
	timestampMs: BigInt

	@Required
	@Column("BigDecimal")
	vaultBalance: BigDecimal

	@Required
	@Column("BigDecimal")
	weETHEffectiveBalance: BigDecimal
  constructor(data: Partial<LyraVaultUserSnapshot>) {super()}
}

@Entity("LyraVaultTokenPrice")
export class LyraVaultTokenPrice extends AbstractEntity  {

	@Required
	@Column("ID")
	id: ID

	@Required
	@Column("String")
	vaultAddress: String

	@Required
	@Column("BigInt")
	timestampMs: BigInt

	@Required
	@Column("BigDecimal")
	vaultToUnderlying: BigDecimal
  constructor(data: Partial<LyraVaultTokenPrice>) {super()}
}


const source = `type LyraVaultUserSnapshot @entity {
    id: ID!
    owner: String!
    vaultName: String!
    vaultAddress: String!
    timestampMs: BigInt!
    vaultBalance: BigDecimal!
    weETHEffectiveBalance: BigDecimal!
}

type LyraVaultTokenPrice @entity {
    id: ID!
    vaultAddress: String!
    timestampMs: BigInt!
    vaultToUnderlying: BigDecimal!
}`
DatabaseSchema.register({
  source,
  entities: {
    "LyraVaultUserSnapshot": LyraVaultUserSnapshot,
		"LyraVaultTokenPrice": LyraVaultTokenPrice
  }
})
