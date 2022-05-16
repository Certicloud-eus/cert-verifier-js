import { SUB_STEPS, VerificationSteps } from '../../src/constants/verificationSteps';
import i18n from '../../src/data/i18n.json';
import currentLocale from '../../src/constants/currentLocale';

const defaultLanguageSet = i18n[currentLocale.locale];

export default [
  {
    code: VerificationSteps.formatValidation,
    label: defaultLanguageSet.steps.formatValidationLabel,
    labelPending: defaultLanguageSet.steps.formatValidationLabelPending,
    subSteps: [
      {
        code: SUB_STEPS.checkImagesIntegrity,
        label: defaultLanguageSet.subSteps.checkImagesIntegrityLabel,
        labelPending: defaultLanguageSet.subSteps.checkImagesIntegrityLabelPending,
        parentStep: VerificationSteps.formatValidation
      }
    ]
  },
  {
    code: VerificationSteps.proofVerification,
    label: defaultLanguageSet.steps.signatureVerificationLabel,
    labelPending: defaultLanguageSet.steps.signatureVerificationLabelPending,
    subSteps: [
      {
        code: 'computeLocalHash',
        label: defaultLanguageSet.subSteps.computeLocalHashLabel,
        labelPending: defaultLanguageSet.subSteps.computeLocalHashLabelPending,
        parentStep: VerificationSteps.proofVerification
      },
      {
        code: 'compareHashes',
        label: defaultLanguageSet.subSteps.compareHashesLabel,
        labelPending: defaultLanguageSet.subSteps.compareHashesLabelPending,
        parentStep: VerificationSteps.proofVerification
      },
      {
        code: 'checkReceipt',
        label: defaultLanguageSet.subSteps.checkReceiptLabel,
        labelPending: defaultLanguageSet.subSteps.checkReceiptLabelPending,
        parentStep: VerificationSteps.proofVerification
      }
    ]
  },
  {
    code: VerificationSteps.statusCheck,
    label: defaultLanguageSet.steps.statusCheckLabel,
    labelPending: defaultLanguageSet.steps.statusCheckLabelPending,
    subSteps: [
      {
        code: SUB_STEPS.checkRevokedStatus,
        label: defaultLanguageSet.subSteps.checkRevokedStatusLabel,
        labelPending: defaultLanguageSet.subSteps.checkRevokedStatusLabelPending,
        parentStep: VerificationSteps.statusCheck
      },
      {
        code: SUB_STEPS.checkExpiresDate,
        label: defaultLanguageSet.subSteps.checkExpiresDateLabel,
        labelPending: defaultLanguageSet.subSteps.checkExpiresDateLabelPending,
        parentStep: VerificationSteps.statusCheck
      }
    ]
  }
];
