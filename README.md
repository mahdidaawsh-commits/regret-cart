# RegretCart

A standalone GenLayer replenishment planner that minimizes worst-case **regret** over a consensus-interpreted joint demand envelope. Two products share additional-order capacity and a purchasing budget. The contract stores a complete opportunity-loss decision table and a worst-case demand witness for every feasible order.

The important nondeterministic operation is interpreting a full external planning report: product-specific and combined-demand bounds, explicit zero, absent limits, and historical/point-forecast decoys. Changing the combined-demand restriction can change the winning order even with identical individual product ranges and costs. Validators independently fetch and interpret all six bounds, compare exact integers (including UNKNOWN), then substantively audit supporting source clauses.

## Run

Python 3.13 and Node 24:

```sh
pip install -r requirements-dev.txt
genvm-lint download --version v0.2.16
genvm-lint check contracts/regret_cart.py --json
python -m pytest tests/direct -q
```

The pinned GenVM runner is in the first source line. Public methods are `solve()` and `get_state()`. Constructor configuration is immutable; `solve()` is permissionless and one-shot. No administrator can replace a report, revise costs, bypass review or override the chosen action.

[Contract](contracts/regret_cart.py) · [Design and trust boundary](docs/design.md) · [Proofs](proofs/README.md) · [Submission text](docs/submission.md).

The mathematical minimax-regret criterion is established decision theory, not a claimed invention. This repository's contribution is its bounded, independently validated GenLayer implementation and complete replayable decision artifacts. Generic CLI transport and the Windows direct-test workaround reuse MIT-licensed infrastructure from [VectorReserve](https://github.com/gabrieladash123-bit/vector-reserve); the inventory mechanism and its tests are new.

Fixtures are synthetic scenario reports, not verified forecasts, real sales or supplier delivery. The contract creates an immutable planning decision; it neither purchases inventory nor moves tokens or funds.
