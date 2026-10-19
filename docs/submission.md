Category: Builder → Intelligent Contracts

Title: RegretCart: Consensus joint-demand replenishment planner

Description:

RegretCart chooses a two-product replenishment order by minimizing worst-case regret under shared capacity and purchasing limits. Leader and validators fetch a commit-pinned planning report, verify its bytes and independently interpret six product and combined-demand bounds. Exact agreement includes zero and UNKNOWN; a second validator audit checks substantive source anchors. Agreed bounds define the feasible joint-demand set. An exhaustive integer optimizer compares every order against hindsight orders obeying the same budget and capacity, stores every regret profile and a worst-case witness, then freezes PLANNED, REVIEW or INCONSISTENT. Synthetic StudioNet scenarios compare correlated and rectangular demand, missing bounds and incompatible constraints. The repository includes direct validator tests, independent Python/JavaScript oracles and receipt verification. This is an immutable planning primitive; it does not forecast demand, buy inventory or transfer funds.

Repository: https://github.com/mahdidaawsh-commits/regret-cart
Source: https://github.com/mahdidaawsh-commits/regret-cart/blob/main/contracts/regret_cart.py
Proofs: https://github.com/mahdidaawsh-commits/regret-cart/blob/main/proofs/README.md
