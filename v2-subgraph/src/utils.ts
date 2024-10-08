import { BigInt,Bytes } from '@graphprotocol/graph-ts';

class DecodedHash {
  address: string;
  subId: BigInt;

  constructor(address: string, subId: BigInt) {
    this.address = address;
    this.subId = subId;
  }
}

export function decodeHashWithEthers(hashHex: Bytes): DecodedHash {
  const reversedBytes = Bytes.fromUint8Array(hashHex.reverse() as Uint8Array);
  const hashBigInt = BigInt.fromUnsignedBytes(reversedBytes);

  // Extract the address
  const shiftedAddress = hashBigInt.rightShift(96); // Shift right by 96 bits
  const addressMask = BigInt.fromString('0xffffffffffffffffffffffffffffffffffffffff');
  const addressBigInt = shiftedAddress.bitAnd(addressMask);
  const addressHex = addressBigInt.toHexString().slice(2).padStart(40, '0');
  const address = '0x' + addressHex.toLowerCase();

  // Extract the subId
  const subIdMask = BigInt.fromString('0xffffffffffffffffffffffff');
  const subId = hashBigInt.bitAnd(subIdMask);

  return new DecodedHash(address, subId);
}

class OptionDetails {
  name: string;
  expiry: i32;
  strike: BigInt;
  isCall: boolean;

  constructor(name: string, expiry: i32, strike: BigInt, isCall: boolean) {
    this.name = name;
    this.expiry = expiry;
    this.strike = strike;
    this.isCall = isCall;
  }
}

export function getOptionDetails(subId: BigInt): OptionDetails {
    const expiry = subId.bitAnd(BigInt.fromI32(0xFFFFFFFF)).toI32()
    const strike = subId.rightShift(32).bitAnd(BigInt.fromI64(0x7FFFFFFFFFFFFFFF))
    const isCall = subId.rightShift(95).bitAnd(BigInt.fromI32(1)).equals(BigInt.fromI32(1))
  
    const strikeAdjusted = strike.times(BigInt.fromString('10000000000'))
    const optionType = isCall ? 'C' : 'P'
    const expiryDate = new Date(expiry * 1000)
    const formattedExpiry = `${expiryDate.getUTCFullYear()}${(expiryDate.getUTCMonth() + 1).toString().padStart(2, '0')}${expiryDate.getUTCDate().toString().padStart(2, '0')}`
  
    // Format strike as a whole number
    const strikeFormatted = strikeAdjusted.div(BigInt.fromString('10000000000')).toString()
  
    const name = `${formattedExpiry}-${strikeFormatted}-${optionType}`
  
    return new OptionDetails(name, expiry, strike, isCall)
  }