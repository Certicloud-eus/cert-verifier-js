import { MerkleProof2019 } from '../models/MerkleProof2019';
import { IDidDocument } from '../models/DidDocument';
import { IDidDocumentPublicKey } from '@decentralized-identity/did-common-typescript';
import { publicKeyUInt8ArrayFromJwk, ISecp256k1PublicKeyJwk } from '../helpers/keyUtils';
import * as bitcoin from 'bitcoinjs-lib';
import { IBlockchainObject } from '../constants/blockchains';

const baseError = 'Issuer identity mismatch';

function getDocumentId (didDocument: IDidDocument): string {
  return didDocument.id;
}

function checkVerificationMethod (didDocument: IDidDocument, verificationMethod: string): boolean {
  const documentId = getDocumentId(didDocument);
  const verificationDid = verificationMethod.split('#')[0];
  return documentId === verificationDid;
}

function findVerificationMethodPublicKey (didDocument: IDidDocument, verificationMethod: string): IDidDocumentPublicKey {
  const verificationMethodId = verificationMethod.split('#')[1];
  const verificationMethodFromDocument = didDocument.verificationMethod;
  return verificationMethodFromDocument
    .filter(verificationMethod => verificationMethod.id === `#${verificationMethodId}`)[0];
}

function retrieveIssuingAddress (verificationMethodPublicKey: IDidDocumentPublicKey, chain: IBlockchainObject): string {
  const publicKey = publicKeyUInt8ArrayFromJwk(verificationMethodPublicKey.publicKeyJwk as ISecp256k1PublicKeyJwk);
  const address = bitcoin.payments.p2pkh({ pubkey: publicKey, network: bitcoin.networks[chain.code] }).address;
  return address;
}

export interface IConfirmDidSignatureApi {
  didDocument: IDidDocument;
  proof: MerkleProof2019;
  issuingAddress: string;
  chain: IBlockchainObject;
}

export default function confirmDidSignature ({
  didDocument,
  proof,
  issuingAddress,
  chain
}: IConfirmDidSignatureApi): boolean {
  try {
    const { verificationMethod } = proof;

    if (!checkVerificationMethod(didDocument, verificationMethod)) {
      throw new Error(`${baseError} - the identity document provided by the issuer does not match the verification method`);
    }

    const verificationMethodPublicKey = findVerificationMethodPublicKey(didDocument, verificationMethod);
    if (!verificationMethodPublicKey) {
      throw new Error(`${baseError} - the identity document provided by the issuer does not reference the verification method`);
    }

    if (issuingAddress !== retrieveIssuingAddress(verificationMethodPublicKey, chain)) {
      throw new Error(`${baseError} - the provided verification method does not match the issuer identity`);
    }

    return true;
  } catch (e) {
    console.error(e);
    throw new Error(`${baseError} - ${e.message as string}`);
  }
}