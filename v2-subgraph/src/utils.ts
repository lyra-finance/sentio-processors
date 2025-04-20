import { BigInt,Bytes, log } from '@graphprotocol/graph-ts';
import { Asset, AssetContract, Currency } from '../generated/schema';
import { json, BigDecimal } from '@graphprotocol/graph-ts';

export const ONE = BigDecimal.fromString('1000000000000000000')

// MUST BE LOWERCASE
const ADDRESS_MAP = `{
  "0xaf65752c4643e25c02f693f9d4fe19cf23a095e3" :{
      "currency": "ETH",
      "type": "perp"
  },
  "0xdba83c0c654db1cd914fa2710ba743e925b53086" :{
      "currency": "BTC",
      "type": "perp"
  },
  "0xf00a5bd70772a4cd9a25fa856238962ec5ad5326" :{
      "currency": "SOL",
      "type": "perp"
  },
  "0x4bb4c3cdc7562f08e9910a0c7d8bb7e108861eb4":{ 
      "currency": "ETH",
      "type": "option"
  },
  "0xd0711b9ebe84b778483709cde62bacfdbae13623":{ 
      "currency": "BTC",
      "type": "option"
  },
  "0x57b03e14d409adc7fab6cfc44b5886cad2d5f02b":{
    "currency": "USDC",
    "type": "spot"
  }
}`

const addresses = json.fromString(ADDRESS_MAP)


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

export function encodeAssetId(assetAddress: Bytes, subId: BigInt): Bytes {
  // Convert address to BigInt
  let addressBigInt = BigInt.fromUnsignedBytes(assetAddress)

  // Shift left by 96 bits (equivalent to << 96 in Solidity)
  let shiftedAddress = addressBigInt.leftShift(96)

  // Combine with subId using bitwise OR
  let combined = shiftedAddress.bitOr(subId)

  // Convert to bytes32
  return Bytes.fromBigInt(combined)
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

function getOptionDetails(subId: BigInt): OptionDetails {
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


export function handleNewAsset(assetId: Bytes): Asset {
  let asset = new Asset(assetId.toHexString())
  const decodedHash = decodeHashWithEthers(assetId)

  let assetContract = AssetContract.load(decodedHash.address)
  if (assetContract == null) {
    assetContract = handleNewAssetContract(decodedHash.address)
  }

  if (assetContract.assetType == 'Option') {
    
    let optionDetails = getOptionDetails(decodedHash.subId)
    asset.name = assetContract.currency + '-' + optionDetails.name
    asset.expiry = optionDetails.expiry
    asset.strike = optionDetails.strike.toI32()
    asset.isCall = optionDetails.isCall
  } else if (assetContract.assetType == 'Perp') {
    asset.name = assetContract.currency + '-Perp'
  } else if (assetContract.assetType == 'Spot') {
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
  let assetContract = new AssetContract(assetId);
  assetContract.address = assetId;

  let assetInfo = addresses.toObject().get(assetId);
  if (assetInfo) {
    let assetInfoObj = assetInfo.toObject();
    let currencyValue = assetInfoObj.get('currency');
    let typeValue = assetInfoObj.get('type');

    assert(currencyValue != null, 'Currency value is null');
    assert(typeValue != null, 'Type value is null');

    if (currencyValue) {
      let currency = Currency.load(currencyValue.toString())
      if (currency == null) {
        currency = new Currency(currencyValue.toString())
        currency.save()
      }
      assetContract.currency = currency.id;
    } else {
      let currency = Currency.load('Unknown')
      if (currency == null) {
        currency = new Currency('Unknown')
        currency.save()
      }
      assetContract.currency = currency.id;
    }

    if (typeValue) {
      let typeString = typeValue.toString().toLowerCase();
      if (typeString == 'option') {
        assetContract.assetType = 'Option';
      } else if (typeString == 'perp') {
        assetContract.assetType = 'Perp';
      } else if (typeString == 'spot') {
        assetContract.assetType = 'Spot';
      } else {
        assetContract.assetType = 'Unknown';
      }
    } else {
      assetContract.assetType = 'Unknown';
    }
  } else {
    assetContract.assetType = 'Unknown';
    let currency = Currency.load('Unknown')
    if (currency == null) {
      currency = new Currency('Unknown')
      currency.save()
    }
    assetContract.currency = currency.id;
  }

  assetContract.save();
  return assetContract;
}