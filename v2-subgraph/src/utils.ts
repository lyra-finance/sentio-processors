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
  const hashBigInt = BigInt.fromUnsignedBytes(hashHex);

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