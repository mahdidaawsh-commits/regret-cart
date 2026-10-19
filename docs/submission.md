Category: Builder → Intelligent Contracts

Title: RegretCart: Consensus joint-demand replenishment planner

Description:

RegretCart chooses a two-product replenishment order by minimizing worst-case regret under shared capacity and purchasing limits. Leader and validators fetch a commit-pinned planning report, verify its bytes and independently interpret six product and combined-demand bounds. Exact agreement includes zero and UNKNOWN; a second validator audit checks substantive source anchors. Agreed bounds define the feasible joint-demand set. An exhaustive integer optimizer compares every order against hindsight orders obeying the same budget and capacity, stores every regret profile and a worst-case witness, then freezes PLANNED, REVIEW or INCONSISTENT. Synthetic StudioNet scenarios compare correlated and rectangular demand, missing bounds and incompatible constraints. The repository includes 63 tests, independent Python/JavaScript oracles and nine finalized receipts. This is an immutable planning primitive; it does not forecast demand, buy inventory or transfer funds.

Repository: https://github.com/mahdidaawsh-commits/regret-cart
Source: https://github.com/mahdidaawsh-commits/regret-cart/blob/main/contracts/regret_cart.py
Proofs: https://github.com/mahdidaawsh-commits/regret-cart/blob/main/proofs/README.md

GenLayer contract explorer: https://explorer-studio.genlayer.com/address/0x41367332cD218A515e44aeFc6CABbF85A5A9a39C
Deployment: https://explorer-studio.genlayer.com/tx/0x7ca2431ab19c31a2980b1dc359c1c24eac018dd106b84c1ac1aa32afbff981ec
Correlated-demand decision: https://explorer-studio.genlayer.com/tx/0xfc05d2051ce0cf2d1fc19113fd70ada098ef74cda9743b4ff107dc4102d810b5
Rectangular-demand decision: https://explorer-studio.genlayer.com/tx/0x8bb119bb034d3220a1d2c73d6bf6eb068c224759cd7a70f06c1f4b9644a0a59a
