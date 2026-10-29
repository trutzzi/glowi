-- Allergies are health data (GDPR art. 9): from now on stored only with the
-- client's explicit consent, recorded here.
ALTER TABLE "User" ADD COLUMN "allergiesConsentAt" TIMESTAMP(3);

-- Birthday and marketing consent are no longer collected (data minimisation):
-- erase what was stored. The columns stay until a later release, so a rollback
-- to the previous version still works.
UPDATE "User"
SET "birthday" = NULL,
    "smsMarketingConsent" = false,
    "emailMarketingConsent" = false,
    "consentUpdatedAt" = NULL;
