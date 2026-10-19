# Verification

Live deployment receipts will be recorded here after the published proof workflow completes. Direct tests are independent of live network consensus; they use web/model mocks and explicitly run validator callbacks.

The proof runner exercises four fresh instances and a repeat-call rejection. `node scripts/verify-proofs.cjs` re-fetches receipts, source and state; `--offline` checks downloaded artifacts without fresh network reads. Neither mode sends transactions.
