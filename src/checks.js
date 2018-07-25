import bitcoin from 'bitcoinjs-lib';
import jsonld from 'jsonld';
import { BLOCKCHAINS, CERTIFICATE_VERSIONS, CONFIG, CONTEXTS as ContextsMap, SUB_STEPS } from './constants';
import domain from './domain';
import sha256 from 'sha256';
import { dateToUnixTimestamp } from './helpers/date';
import { VerifierError } from './models';

const {
  obi: OBI_CONTEXT,
  blockcerts: BLOCKCERTS_CONTEXT,
  blockcertsv1_2: BLOCKCERTSV1_2_CONTEXT,
  blockcertsv2: BLOCKCERTSV2_CONTEXT
} = ContextsMap;
const CONTEXTS = {};
// Preload contexts
CONTEXTS['https://w3id.org/blockcerts/schema/2.0-alpha/context.json'] = BLOCKCERTS_CONTEXT;
CONTEXTS['https://www.blockcerts.org/schema/2.0-alpha/context.json'] = BLOCKCERTS_CONTEXT;
CONTEXTS['https://w3id.org/openbadges/v2'] = OBI_CONTEXT;
CONTEXTS['https://openbadgespec.org/v2/context.json'] = OBI_CONTEXT;
CONTEXTS['https://w3id.org/blockcerts/v2'] = BLOCKCERTSV2_CONTEXT;
CONTEXTS['https://www.w3id.org/blockcerts/schema/2.0/context.json'] = BLOCKCERTSV2_CONTEXT;
CONTEXTS['https://w3id.org/blockcerts/v1'] = BLOCKCERTSV1_2_CONTEXT;

export function ensureNotRevokedBySpentOutput (
  revokedAddresses,
  issuerRevocationKey,
  recipientRevocationKey
) {
  if (issuerRevocationKey) {
    const revokedAssertionId = revokedAddresses.findIndex(
      address => address === issuerRevocationKey
    );
    const isRevokedByIssuer = revokedAssertionId !== -1;
    if (isRevokedByIssuer) {
      throw new VerifierError(
        SUB_STEPS.checkRevokedStatus,
        domain.certificates.generateRevocationReason(
          revokedAddresses[revokedAssertionId].revocationReason
        )
      );
    }
  }
  if (recipientRevocationKey) {
    const revokedAssertionId = revokedAddresses.findIndex(
      address => address === recipientRevocationKey
    );
    const isRevokedByRecipient = revokedAssertionId !== -1;
    if (isRevokedByRecipient) {
      throw new VerifierError(
        SUB_STEPS.checkRevokedStatus,
        domain.certificates.generateRevocationReason(
          revokedAddresses[revokedAssertionId].revocationReason
        )
      );
    }
  }
}

export function ensureNotRevokedByList (revokedAssertions, assertionUid) {
  if (!revokedAssertions) {
    // nothing to do
    return;
  }
  const revokedAddresses = revokedAssertions.map(output => output.id);
  const revokedAssertionId = revokedAddresses.findIndex(
    id => id === assertionUid
  );
  const isRevokedByIssuer = revokedAssertionId !== -1;

  if (isRevokedByIssuer) {
    throw new VerifierError(
      SUB_STEPS.checkRevokedStatus,
      domain.certificates.generateRevocationReason(
        revokedAssertions[revokedAssertionId].revocationReason
      )
    );
  }
}

export function ensureIssuerSignature (
  issuerKey,
  certificateUid,
  certificateSignature,
  chain
) {
  let bitcoinChain =
    chain === BLOCKCHAINS.bitcoin.code
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;
  if (
    !bitcoin.message.verify(
      issuerKey,
      certificateSignature,
      certificateUid,
      bitcoinChain
    )
  ) {
    throw new VerifierError('Issuer key does not match derived address.');
  }
}

export function ensureHashesEqual (actual, expected) {
  if (actual !== expected) {
    throw new VerifierError(
      SUB_STEPS.compareHashes,
      'Computed hash does not match remote hash'
    );
  }
}

export function ensureMerkleRootEqual (merkleRoot, remoteHash) {
  if (merkleRoot !== remoteHash) {
    throw new VerifierError(
      SUB_STEPS.checkMerkleRoot,
      'Merkle root does not match remote hash.'
    );
  }
}

export function ensureValidIssuingKey (keyMap, txIssuingAddress, txTime) {
  let validKey = false;
  const theKey = getCaseInsensitiveKey(keyMap, txIssuingAddress);
  txTime = dateToUnixTimestamp(txTime);
  if (theKey) {
    validKey = true;
    if (theKey.created) {
      validKey &= txTime >= theKey.created;
    }
    if (theKey.revoked) {
      validKey &= txTime <= theKey.revoked;
    }
    if (theKey.expires) {
      validKey &= txTime <= theKey.expires;
    }
  }
  if (!validKey) {
    throw new VerifierError(
      SUB_STEPS.checkAuthenticity,
      'Transaction occurred at time when issuing address was not considered valid.'
    );
  }
}

export function ensureValidReceipt (receipt) {
  let proofHash = receipt.targetHash;
  const merkleRoot = receipt.merkleRoot;
  try {
    const proof = receipt.proof;
    const isProof = !!proof;
    if (isProof) {
      for (let index in proof) {
        const node = proof[index];
        let appendedBuffer;
        if (typeof node.left !== 'undefined') {
          appendedBuffer = _toByteArray(`${node.left}${proofHash}`);
          proofHash = sha256(appendedBuffer);
        } else if (typeof node.right !== 'undefined') {
          appendedBuffer = _toByteArray(`${proofHash}${node.right}`);
          proofHash = sha256(appendedBuffer);
        } else {
          throw new VerifierError(
            SUB_STEPS.checkReceipt,
            'We should never get here.'
          );
        }
      }
    }
  } catch (e) {
    throw new VerifierError(
      SUB_STEPS.checkReceipt,
      'The receipt is malformed. There was a problem navigating the merkle tree in the receipt.'
    );
  }

  if (proofHash !== merkleRoot) {
    throw new VerifierError(
      SUB_STEPS.checkReceipt,
      'Invalid Merkle Receipt. Proof hash did not match Merkle root'
    );
  }
}

/**
 * isTransactionIdValid
 *
 * @param transactionId
 * @returns {string}
 */
export function isTransactionIdValid (transactionId) {
  if (typeof transactionId === 'string' && transactionId.length > 0) {
    return transactionId;
  } else {
    throw new VerifierError(
      SUB_STEPS.getTransactionId,
      'Cannot verify this certificate without a transaction ID to compare against.'
    );
  }
}

export function computeLocalHash (document, version) {
  let expandContext = document['@context'];
  const theDocument = document;
  if (version === CERTIFICATE_VERSIONS.V2_0 && CONFIG.CheckForUnmappedFields) {
    if (expandContext.find(x => x === Object(x) && '@vocab' in x)) {
      expandContext = null;
    } else {
      expandContext.push({'@vocab': 'http://fallback.org/'});
    }
  }
  const nodeDocumentLoader = jsonld.documentLoaders.node();
  const customLoader = function (url, callback) {
    if (url in CONTEXTS) {
      return callback(null, {
        contextUrl: null,
        document: CONTEXTS[url],
        documentUrl: url
      });
    }
    return nodeDocumentLoader(url, callback);
  };
  jsonld.documentLoader = customLoader;
  let normalizeArgs = {
    algorithm: 'URDNA2015',
    format: 'application/nquads'
  };
  if (expandContext) {
    normalizeArgs.expandContext = expandContext;
  }

  return new Promise((resolve, reject) => {
    jsonld.normalize(theDocument, normalizeArgs, (err, normalized) => {
      const isErr = !!err;
      if (isErr) {
        reject(
          new VerifierError(
            SUB_STEPS.computeLocalHash,
            'Failed JSON-LD normalization'
          )
        );
      } else {
        let unmappedFields = getUnmappedFields(normalized);
        if (unmappedFields) {
          reject(
            new VerifierError(
              SUB_STEPS.computeLocalHash,
              'Found unmapped fields during JSON-LD normalization'
            )
          ); // + unmappedFields.join(",")
        } else {
          resolve(sha256(_toUTF8Data(normalized)));
        }
      }
    });
  });
}

function getUnmappedFields (normalized) {
  const myRegexp = /<http:\/\/fallback\.org\/(.*)>/;
  const matches = myRegexp.exec(normalized);
  if (matches) {
    const unmappedFields = [];
    for (let i = 0; i < matches.length; i++) {
      unmappedFields.push(matches[i]);
    }
    return unmappedFields;
  }
  return null;
}

export function ensureNotExpired (expires = null) {
  if (!expires) {
    return;
  }
  const expiryDate = dateToUnixTimestamp(expires);
  if (new Date() >= expiryDate) {
    throw new VerifierError(
      SUB_STEPS.checkExpiresDate,
      'This certificate has expired.'
    );
  }
}

function _toByteArray (hexString) {
  const outArray = [];
  const byteSize = 2;
  for (let i = 0; i < hexString.length; i += byteSize) {
    outArray.push(parseInt(hexString.substring(i, i + byteSize), 16));
  }
  return outArray;
}

function _toUTF8Data (string) {
  const utf8 = [];
  for (let i = 0; i < string.length; i++) {
    let charcode = string.charCodeAt(i);
    if (charcode < 0x80) {
      utf8.push(charcode);
    } else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    } else {
      // surrogate pair
      i++;
      // UTF-16 encodes 0x10000-0x10FFFF by
      // subtracting 0x10000 and splitting the
      // 20 bits of 0x0-0xFFFFF into two halves
      charcode =
        0x10000 + (((charcode & 0x3ff) << 10) | (string.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return utf8;
}

function getCaseInsensitiveKey (obj, value) {
  let key = null;
  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      if (prop.toLowerCase() === value.toLowerCase()) {
        key = prop;
      }
    }
  }
  return obj[key];
}
