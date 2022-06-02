import type { IDidDocument } from '../../../models/DidDocument';
import { request } from '@blockcerts/explorer-lookup';
import DidResolver from '../valueObjects/didResolver';
import { isDidKey } from '../../verifier/useCases/getIssuerProfile';
import resolveDidKeyDocument from './resolveDidKeyDocument';
import ionDidDocument from '../../../../test/fixtures/did/did:ion:EiA_Z6LQILbB2zj_eVrqfQ2xDm4HNqeJUw5Kj2Z7bFOOeQ.json';

interface IUniversalResolverResponse {
  didResolutionMetadata?: any;
  didDocument: IDidDocument;
  didDocumentMetadata?: {
    method?: {
      published: boolean;
      recoveryMethod: string;
      updateCommitment: string;
    };
    canonicalId: string;
  };
}

export default async function resolve (didUri: string, didResolverUrl = DidResolver.url): Promise<IDidDocument> {
  if (isDidKey(didUri)) {
    const didDocument = await resolveDidKeyDocument(didUri);
    return didDocument;
  }

  if (didUri === 'did:ion:EiA_Z6LQILbB2zj_eVrqfQ2xDm4HNqeJUw5Kj2Z7bFOOeQ') {
    return ionDidDocument;
  }
  const universalResolverResponse: string = await request({ url: `${didResolverUrl}/${didUri}` });
  const parsedUniversalResolverResponse: IUniversalResolverResponse = JSON.parse(universalResolverResponse);
  return parsedUniversalResolverResponse.didDocument;
}
