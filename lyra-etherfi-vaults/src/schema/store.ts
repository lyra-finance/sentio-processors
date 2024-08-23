
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
	@Column("String")
	id: String

	@Required
	@Column("String")
	owner: String

	@Required
	@Column("String")
	vaultAddress: String

	@Required
	@Column("BigInt")
	timestampMilli: BigInt

	@Required
	@Column("BigDecimal")
	vaultBalance: BigDecimal

	@Required
	@Column("BigDecimal")
	weETHEffectiveBalance: BigDecimal
  constructor(data: Partial<LyraVaultUserSnapshot>) {super()}
}


const source = `type LyraVaultUserSnapshot @entity {
    id: String!
    owner: String!
    vaultAddress: String!
    timestampMilli: BigInt!
    vaultBalance: BigDecimal!
    weETHEffectiveBalance: BigDecimal!
}`
DatabaseSchema.register({
  source,
  entities: {
    "LyraVaultUserSnapshot": LyraVaultUserSnapshot
  }
})
