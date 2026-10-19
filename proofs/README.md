# Verification

Completed on gasless **StudioNet, chain 61999**. All nine receipts finalized with MAJORITY_AGREE: eight successful executions and one expected repeat-call rejection. Four complete final states match fresh RPC/CLI reads, the exact deployed source, decoded actual calldata and the independent JavaScript decision-table oracle. Direct tests use web/model mocks and explicitly run validator callbacks; they are separate from live consensus proofs.

The proof runner exercises four fresh instances and a repeat-call rejection. `node scripts/verify-proofs.cjs` re-fetches receipts, source and state; `--offline` checks downloaded artifacts without fresh network reads. Both need `GENLAYER_CLI_PATH` pointing to pinned CLI 0.39.2; fresh reads use an existing CLI account selected by `REGRET_ACCOUNT`. Neither verifier mode sends transactions.

## Scenario decisions

| Scenario | Contract explorer | Observed result |
| --- | --- | --- |
| Correlated demand | [0x41367332cD218A515e44aeFc6CABbF85A5A9a39C](https://explorer-studio.genlayer.com/address/0x41367332cD218A515e44aeFc6CABbF85A5A9a39C) | 9 joint-demand pairs; 9 feasible orders; order **[1,2]**, maximum regret **10**, worst cost **81** |
| Rectangular demand | [0x72539b983c736D84b7Fd5E72d93655Cb82EDa544](https://explorer-studio.genlayer.com/address/0x72539b983c736D84b7Fd5E72d93655Cb82EDa544) | 81 joint-demand pairs; same 9 orders; order **[0,1]**, maximum regret **10**, worst cost **111** |
| Missing combined maximum | [0x6C89E63874688b25Fbf44351Dce659E7a2fF781C](https://explorer-studio.genlayer.com/address/0x6C89E63874688b25Fbf44351Dce659E7a2fF781C) | **REVIEW**, total_max remains UNKNOWN; no order selected |
| Incompatible restrictions | [0x48FF6b1247fF38dcfF9c0Afcb623591fC666E85a](https://explorer-studio.genlayer.com/address/0x48FF6b1247fF38dcfF9c0Afcb623591fC666E85a) | **INCONSISTENT**, zero feasible demand pairs; no order selected |

The first two instances differ only in their source report and its hash. Both have initial stock [0,0], purchase costs [2,3], holding costs [1,1], shortage penalties [3,12], additional-order capacity 3 and budget 8. The same product ranges are 0..8 each. Reported combined demand is exactly 8 versus 0..16. That consensus-interpreted restriction materially changes the selected order.

Correlated selected-order regret witness: demand [8,0], cost 31 versus feasible hindsight order [3,0] costing 21. Rectangular witness: demand [1,2], cost 18 versus hindsight [1,2] costing 8. Every other feasible order has its own stored profile and witness in the final-state JSON files.

## Finalized transactions

Votes are **agree / disagree / idle**; idle is included in the five-validator denominator. The conflict scenario's dissent is preserved, not described as unanimity.

| Operation | Explorer transaction | Execution | Votes |
| --- | --- | --- | --- |
| Correlated deploy | [0x7ca2431a…](https://explorer-studio.genlayer.com/tx/0x7ca2431ab19c31a2980b1dc359c1c24eac018dd106b84c1ac1aa32afbff981ec) | SUCCESS | 3 / 0 / 2 |
| Correlated solve | [0xfc05d205…](https://explorer-studio.genlayer.com/tx/0xfc05d2051ce0cf2d1fc19113fd70ada098ef74cda9743b4ff107dc4102d810b5) | SUCCESS | 3 / 0 / 2 |
| Correlated repeat solve | [0x05a508bd…](https://explorer-studio.genlayer.com/tx/0x05a508bdcfd6486c09964068c4f6aa2f6993f741a8388779a84f38f70ea1d986) | Expected ERROR: `[EXPECTED] Plan already solved` | 4 / 0 / 1 |
| Rectangular deploy | [0x4294f9b0…](https://explorer-studio.genlayer.com/tx/0x4294f9b060b416f5f1160ff180cc5ad2ea8ea34c27e07935c495a523a7059d60) | SUCCESS | 4 / 0 / 1 |
| Rectangular solve | [0x8bb119bb…](https://explorer-studio.genlayer.com/tx/0x8bb119bb034d3220a1d2c73d6bf6eb068c224759cd7a70f06c1f4b9644a0a59a) | SUCCESS | 3 / 0 / 2 |
| Unknown deploy | [0x9abdb031…](https://explorer-studio.genlayer.com/tx/0x9abdb031f168d6279ff4a8efd3b9f8faf930383c1fd53e202d0a93cbb132e423) | SUCCESS | 4 / 0 / 1 |
| Unknown solve | [0x7bbc58f6…](https://explorer-studio.genlayer.com/tx/0x7bbc58f671cc1631620b6652481139ca6590483c21b2ce765e0ae60fecc4d26a) | SUCCESS | 3 / 0 / 2 |
| Conflict deploy | [0xf013e637…](https://explorer-studio.genlayer.com/tx/0xf013e637f35e993f764d27b04dbc669aadc6aebadb642904ed334dc46c39e4d9) | SUCCESS | 3 / 0 / 2 |
| Conflict solve | [0x349d1eaf…](https://explorer-studio.genlayer.com/tx/0x349d1eaf26b97df1f3d5d23e8775bb4f20d01781ebd52f665d8319ee7a0157e1) | SUCCESS | 3 / 1 / 1 |

## Reproducibility

- [Passing CI](https://github.com/mahdidaawsh-commits/regret-cart/actions/runs/39251166381): 63 tests, zero failures.
- [Passing deployment and proof workflow](https://github.com/mahdidaawsh-commits/regret-cart/actions/runs/39251177425): 63 hosted tests; nine finalized receipts; source, actual calldata, votes and fresh state verification.
- Source/fixture revision: `f511e82ae55e65488166a2b46cf87403b23e1df2`. Workflow revision: `51bb618294faa71fc3d10d0d06adaced185812b3`.
- Deployed source SHA-256: `de58342fef8151bef9fb72028583fa1fb47c74d499e42058ab5dce9c74fd174b`.
- [Hosted verification](cloud-verification.json), [independent fresh verification](verification.json), [suite configuration](suite.json), [transaction journal](transactions.json), [hosted tests](cloud-direct-tests.xml), [local tests](local-direct-tests.xml).
- Twelve seeded tests check 144 generated problems against a pairwise opportunity-loss oracle; these are generated subcases within 12 tests, not 144 extra pytest tests. Separate JS checks compare every stored profile and witness for all four direct/live scenarios.

All reports are synthetic and public before execution. These proofs establish contract behavior for those inputs, not report truth, forecast coverage, purchased inventory, delivery or economic profit. No wallet private keys, passwords or validator node configuration are published.
