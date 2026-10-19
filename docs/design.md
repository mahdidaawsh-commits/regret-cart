# Contract boundary and decision rule

**User:** choose a trusted report repository, target period, commit-pinned URL/SHA-256, two existing stock quantities and cost vectors, added-order capacity and budget at deployment. Caller cannot submit demand labels at solve time. Applications may display the plan or implement purchasing separately.

**External report:** full JSON `{period, clauses}` with 1–12 prose clauses. The contract fetches raw bytes, checks SHA-256, size, schema, duplicate keys and period. Restricting source to a frozen repository prevents arbitrary post-deployment source substitution; it does not establish publisher honesty or forecast accuracy.

**Consensus:** leader extracts inclusive `amber_min, amber_max, blue_min, blue_max, total_min, total_max`, each with material clause indices. Validators re-fetch the full source and independently produce all six values. Exact equality is required for each decision; anchor indices may differ if substantively supported. A second validator LLM audit checks every value and source anchor, including zero and UNKNOWN (`-1`). No score tolerance or confidence threshold exists. Malformed model outputs and external failures revert without committing a plan. A non-returning leader result is rejected by the custom validator; availability failures may require retry/rotation and never manufacture an uncertainty result.

Missing bounds are not completed from domain limits, arithmetic, point forecasts or historical sales. An explicit exact value supplies both limits. An explicit lower value greater than an explicit upper value is retained for infeasibility detection. Conflicting assertions for the same bound are UNKNOWN. Outside-domain bounds also yield UNKNOWN. Reports are untrusted prompt data; validators and audit reduce but cannot eliminate correlated model or prompt-injection errors.

**Deterministic decision:** if any bound is UNKNOWN, terminal REVIEW with named unknown fields; otherwise enumerate all 169 integer joint-demand pairs in `[0,12]^2` satisfying all six restrictions. An empty intersection produces terminal INCONSISTENT, not a guessed feasible envelope. Otherwise enumerate every nonnegative integer order `q` with `q_amber + q_blue <= capacity` and purchase spend <= budget. Capacity is **additional ordered units**, not a cap on existing inventory. Existing stock is 0..6 each. Added capacity is 0..12, budget 0..108, unit purchase costs 1..9, holding costs 0..9 and shortage penalties 1..20. At most 91 orders exist; ordering nothing is always feasible.

For each feasible demand `d`, define:

`C(q,d) = sum_j [purchase_j*q_j + holding_j*max(stock_j+q_j-d_j,0) + shortage_j*max(d_j-stock_j-q_j,0)]`.

Purchasing cost is charged once per ordered unit, existing inventory is sunk, unmet demand incurs the fixed penalty, excess stock incurs holding cost; there are no sales revenues or salvage credits. All quantities and cost units are integers. This is a single-period planning model, not a predictive distribution.

The clairvoyant benchmark `B(d)` is the minimum `C(p,d)` over the **same feasible order set**. Per-order regret is `max_d [C(q,d)-B(d)]`. Select by `(max_regret, worst_cost, total_ordered, amber_order, blue_order)`, ascending. Thus a budget-constrained planner is never compared against an unconstrained imaginary supplier.

Every feasible order's full profile is stored: maximum regret, worst cost, and lexicographically first demand witnessing maximum regret, with the minimum-cost hindsight order (tie: total ordered, then lexicographic). The contract then freezes PLANNED, REVIEW or INCONSISTENT. There is no certificate issuance/consumption, owner-controlled graph proposal, auction, oracle median or transferred claim balance.

Minimax regret is an established criterion: see the definition and discussion in [Heal and Millner, Uncertainty and Decision Making in Climate Change Economics](https://web.stanford.edu/group/emf-research/docs/CCIIA/2014/Heal_additional-1REEP.pdf). That paper supports the criterion, not this inventory application or any claim of guaranteed forecast coverage.

## Verification and limits

Direct mode explicitly executes validator callbacks rather than assuming leader-mode tests cover them. Twelve seeded tests cover 144 generated problems against a separate pairwise opportunity-loss oracle. A separate JavaScript implementation checks complete direct/live decision profiles. Tests cover unknown-vs-zero, all six disagreeing material bounds, substantive anchor rejection, committed malformed reports, source byte mismatch, duplicate keys, repeat execution and configuration extremes.

The four live scenarios use synthetic reports. Correlated demand `amber+blue=8` selects `[1,2]`; replacing the joint restriction with `[0,16]` selects `[0,1]` under the same costs and limits. Both maximum regrets are 10, with different worst costs and witnesses. Missing total maximum yields REVIEW; incompatible individual and total bounds yield INCONSISTENT. These are durable contract decisions, not proof of future demand, delivery, economic benefit or purchasing execution.

The deployment proof runner sends through pinned GenLayer CLI 0.39.2, journals hashes immediately, never blindly resends ambiguous transactions, and uploads sanitized receipts. The verifier checks exact deployed source, actual decoded constructor/call arguments, signers, targets, FINALIZED status, execution result, MAJORITY_AGREE votes including idle validators, and fresh full-state reads. Disposable CI wallets hold no funds; their encrypted keystores are not uploaded.
