/**
 * Kinds of consent recorded in `user_consent`.
 *
 * An enum rather than a free string so the table can hold more than one
 * agreement per account later (issue #338 lists analytics and account deletion
 * as separate decisions) without the type column drifting into typos.
 */
export enum ConsentType {
  /** Terms of Use, accepted at institution registration. Mandatory. */
  InstitutionTerms = "institution_terms",
}
