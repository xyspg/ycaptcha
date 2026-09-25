// The single lazy-load target for lib/auth. Every email path loads this same
// module, so which path runs first on an instance doesn't change its latency
// (sign-up must not reveal whether an account exists).
export { sendExistingAccountEmail } from "./send-existing-account-email";
export { sendResetPasswordEmail } from "./send-reset-password-email";
export { sendVerificationEmail } from "./send-verification-email";
