import { BigInt,Bytes, log } from '@graphprotocol/graph-ts';

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
  expiry: BigInt;  // Changed from i32 to BigInt
  strike: BigInt;
  isCall: boolean;

  constructor(name: string, expiry: BigInt, strike: BigInt, isCall: boolean) {
    this.name = name;
    this.expiry = expiry;
    this.strike = strike;
    this.isCall = isCall;
  }
}
const UINT32_MAX = BigInt.fromString('0xffffffff');
const UINT63_MAX = BigInt.fromString('0x7fffffffffffffff');

export function getOptionDetails(subId: BigInt): OptionDetails {
  // Extract components
  const expiry = subId.bitAnd(UINT32_MAX);
  const strike = subId.rightShift(32).bitAnd(UINT63_MAX).div(BigInt.fromString('100000000'));
  const isCall = subId.rightShift(95).gt(BigInt.fromI32(0));

  // Format name
  const optionType = isCall ? 'C' : 'P';
  const expiryDate = new Date(expiry.toI64() * 1000);  // Convert to i64 for Date constructor
  const formattedExpiry = `${expiryDate.getUTCFullYear()}${(expiryDate.getUTCMonth() + 1).toString().padStart(2, '0')}${expiryDate.getUTCDate().toString().padStart(2, '0')}`;
  const strikeFormatted = strike.toString();
  const name = `${formattedExpiry}-${strikeFormatted}-${optionType}`;
  return new OptionDetails(name, expiry, strike, isCall);
}