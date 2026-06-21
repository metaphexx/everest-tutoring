// Placeholder env so SDK clients (Resend/Twilio/Stripe) that instantiate at
// import time don't throw during integration tests. The DB defaults to the dev
// SQLite file; integration tests create + tear down their own throwaway rows.
process.env.DATABASE_URL ??= 'file:./dev.db'
process.env.RESEND_API_KEY ??= 're_test_placeholder000000000000000000'
process.env.FROM_EMAIL ??= 'test@everest.test'
process.env.FROM_NAME ??= 'Everest Test'
process.env.TWILIO_ACCOUNT_SID ??= 'AC00000000000000000000000000000000'
process.env.TWILIO_AUTH_TOKEN ??= 'test_auth_token'
process.env.TWILIO_PHONE_NUMBER ??= '+15555550100'
process.env.STRIPE_SECRET_KEY ??= 'sk_test_placeholder'
process.env.ANTHROPIC_API_KEY ??= 'sk-ant-test'
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000'
