# 44 Quadratic twists

**Level 4 · Researcher.** Every x in F_p belongs to the curve or to its quadratic twist. You will draw the twist of
F₂₂₃, check #E + #E′ = 2p + 2, and see what the visualizer’s “quadratic twist” error message means on secp256k1. Read
first: [22 Counting points](22-counting-points.md) and [33 Key formats](33-key-formats.md).

## The twist

Fix a non-square d ∈ F_p. The quadratic twist of E: y² = x³ + ax + b is

  E′: y² = x³ + ad²x + bd³.

E and E′ are isomorphic over F_{p²} (by (x, y) ↦ (dx, d^{3/2}y)) but not over F_p. For each x ∈ F_p, let
f(x) = x³ + ax + b and χ the quadratic character:

- χ(f(x)) = 1: x gives two points of E, and none of E′ at dx;
- χ(f(x)) = −1: no point of E, but f′(dx) = d³f(x) is a square, so two points of E′ at dx;
- f(x) = 0: one point on each.

Summing, #E = p + 1 + Σχ(f(x)) and #E′ = p + 1 − Σχ(f(x)): #E + #E′ = 2p + 2, and the traces are negatives.

### Example 44.1 · The twist of F₂₂₃: y² = x³ + 189

The smallest non-square mod 223 is d = 3, and with a = 0 the twist is y² = x³ + 7 · 3³ = x³ + 189. Type b = `7*3^3`.

[![y² = x³ + 189 over F₂₂₃, the quadratic twist of the Programming Bitcoin curve: 195 dots, #E = 196 and trace +28](../img/44-twist-f223.webp)](../img/44-twist-f223.webp)

**Open this view:** [y² = x³ + 7·3³ over F₂₂₃](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoicGIyMjMiLCJhIjoiMCIsImIiOiI3KjNeMyIsInAiOiIyMjMiLCJnIjoiKDIsIDMzKSIsInAxIjoiKDIsIDMzKSIsInAyIjoiIiwib3AiOiJhZGQiLCJzaG93RyI6dHJ1ZSwiZm9yY2UiOmZhbHNlLCJzaGFwZSI6InRvcnVzIiwibWFwIjoic2NhbGUiLCJiaXRzIjoyNCwic3UiOjI0LCJzdiI6MTYsIlIiOjEuMiwiciI6MC40NiwiZ2xhc3MiOjAuNTUsImJhY2siOjAuNCwic2hvdyI6eyJncmlkIjp0cnVlLCJyaW5ncyI6dHJ1ZSwibGFiZWxzIjp0cnVlLCJjbG91ZCI6dHJ1ZSwiY2hvcmQiOnRydWUsImJldGEiOmZhbHNlLCJtYXAiOnRydWUsInNwaW4iOmZhbHNlfSwicmluZ3MiOnsicDEiOnRydWUsInAyIjp0cnVlLCJzdW0iOnRydWUsImciOmZhbHNlfSwidGhlbWUiOiJkYXJrIiwicGFuZWwiOnRydWUsIm1pbmlCaWciOmZhbHNlLCJsZWdlbmRNaW4iOmZhbHNlLCJzZWNzIjp7ImN1cnZlIjp0cnVlLCJwb2ludHMiOnRydWUsInNoYXBlIjp0cnVlLCJ2aWV3Ijp0cnVlLCJpbnNwZWN0b3IiOnRydWUsInJlbGF0aW9ucyI6dHJ1ZSwidGVzdCI6ZmFsc2V9fQ)

| curve | #E | trace | open |
| --- | --- | --- | --- |
| E: y² = x³ + 7 | 252 = 2² · 3² · 7 | −28 | [open](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoicGIyMjMiLCJhIjoiMCIsImIiOiI3IiwicCI6IjIyMyIsImciOiIoNDcsIDcxKSIsInAxIjoiKDQ3LCA3MSkiLCJwMiI6IiIsIm9wIjoiYWRkIiwic2hvd0ciOnRydWUsImZvcmNlIjpmYWxzZSwic2hhcGUiOiJ0b3J1cyIsIm1hcCI6InNjYWxlIiwiYml0cyI6MjQsInN1IjoyNCwic3YiOjE2LCJSIjoxLjIsInIiOjAuNDYsImdsYXNzIjowLjU1LCJiYWNrIjowLjQsInNob3ciOnsiZ3JpZCI6dHJ1ZSwicmluZ3MiOnRydWUsImxhYmVscyI6dHJ1ZSwiY2xvdWQiOnRydWUsImNob3JkIjp0cnVlLCJiZXRhIjpmYWxzZSwibWFwIjp0cnVlLCJzcGluIjpmYWxzZX0sInJpbmdzIjp7InAxIjp0cnVlLCJwMiI6dHJ1ZSwic3VtIjp0cnVlLCJnIjpmYWxzZX0sInRoZW1lIjoiZGFyayIsInBhbmVsIjp0cnVlLCJtaW5pQmlnIjpmYWxzZSwibGVnZW5kTWluIjpmYWxzZSwic2VjcyI6eyJjdXJ2ZSI6dHJ1ZSwicG9pbnRzIjp0cnVlLCJzaGFwZSI6dHJ1ZSwidmlldyI6dHJ1ZSwiaW5zcGVjdG9yIjp0cnVlLCJyZWxhdGlvbnMiOnRydWUsInRlc3QiOmZhbHNlfX0) |
| E′: y² = x³ + 189 | 196 = 2² · 7² | 28 | [open](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoicGIyMjMiLCJhIjoiMCIsImIiOiI3KjNeMyIsInAiOiIyMjMiLCJnIjoiKDIsIDMzKSIsInAxIjoiKDIsIDMzKSIsInAyIjoiIiwib3AiOiJhZGQiLCJzaG93RyI6dHJ1ZSwiZm9yY2UiOmZhbHNlLCJzaGFwZSI6InRvcnVzIiwibWFwIjoic2NhbGUiLCJiaXRzIjoyNCwic3UiOjI0LCJzdiI6MTYsIlIiOjEuMiwiciI6MC40NiwiZ2xhc3MiOjAuNTUsImJhY2siOjAuNCwic2hvdyI6eyJncmlkIjp0cnVlLCJyaW5ncyI6dHJ1ZSwibGFiZWxzIjp0cnVlLCJjbG91ZCI6dHJ1ZSwiY2hvcmQiOnRydWUsImJldGEiOmZhbHNlLCJtYXAiOnRydWUsInNwaW4iOmZhbHNlfSwicmluZ3MiOnsicDEiOnRydWUsInAyIjp0cnVlLCJzdW0iOnRydWUsImciOmZhbHNlfSwidGhlbWUiOiJkYXJrIiwicGFuZWwiOnRydWUsIm1pbmlCaWciOmZhbHNlLCJsZWdlbmRNaW4iOmZhbHNlLCJzZWNzIjp7ImN1cnZlIjp0cnVlLCJwb2ludHMiOnRydWUsInNoYXBlIjp0cnVlLCJ2aWV3Ijp0cnVlLCJpbnNwZWN0b3IiOnRydWUsInJlbGF0aW9ucyI6dHJ1ZSwidGVzdCI6ZmFsc2V9fQ) |

**Do it yourself**

1. In **Curve**, pick the preset **y² = x³ + 7 over F₂₂₃, Programming Bitcoin**.
2. Type `7*3^3` in **b**, `(2, 33)` in **Generator G** and `(2, 33)` in **P₁**.
3. Empty **P₂**.
4. Read the **Curve** section in the panel.

**Look at:** the facts: **a, b** “0, 189 ≡ −34” (the visualizer names the small negative representative), **#E** “196 = 2² · 7²”, **trace** “t = p + 1 − #E = 28”, the negative of
E’s −28. The table compares the two curves.

**Why:** 252 + 196 = 448 = 2 · 223 + 2. Of the 223 values of x, the script counts 124 values of x where f(x) is a nonzero
square (points on E), 96 where it is not (points on E′, at 3x) and 3 roots of x³ + 7, which give a point with y = 0 on
each curve. E′(F₂₂₃) ≅ Z/2 × Z/98.

### Example 44.2 · x = 15 on the twist of secp256k1

The visualizer refuses `02` followed by x = 5 on secp256k1: “x³+ax+b is a non-residue — this x lies on the quadratic
twist, not the curve” ([33](33-key-formats.md)). Over secp256k1’s p the smallest non-square is d = 3 too, so the twist
is y² = x³ + 189, and x = 5 corresponds to its point at x = 5 · 3 = 15.

[![secp256k1’s p with b = 7·3³: 02 followed by x = 15 is accepted, a point of the twist, where on secp256k1 itself x = 5 was refused](../img/44-secp-twist.webp)](../img/44-secp-twist.webp)

**Open this view:** [02 with x = 15 on y² = x³ + 189](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoiazEtbmVnIiwiYSI6IjAiLCJiIjoiNyozXjMiLCJwIjoiMl4yNTYgLSAyXjMyIC0gOTc3IiwiZyI6IjAyMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwZiIsInAxIjoiMDIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBmIiwicDIiOiIiLCJvcCI6ImFkZCIsInNob3dHIjp0cnVlLCJmb3JjZSI6ZmFsc2UsInNoYXBlIjoidG9ydXMiLCJtYXAiOiJzY2FsZSIsImJpdHMiOjI0LCJzdSI6MjQsInN2IjoxNiwiUiI6MS4yLCJyIjowLjQ2LCJnbGFzcyI6MC41NSwiYmFjayI6MC40LCJzaG93Ijp7ImdyaWQiOnRydWUsInJpbmdzIjp0cnVlLCJsYWJlbHMiOnRydWUsImNsb3VkIjp0cnVlLCJjaG9yZCI6dHJ1ZSwiYmV0YSI6ZmFsc2UsIm1hcCI6dHJ1ZSwic3BpbiI6ZmFsc2V9LCJyaW5ncyI6eyJwMSI6dHJ1ZSwicDIiOnRydWUsInN1bSI6dHJ1ZSwiZyI6ZmFsc2V9LCJ0aGVtZSI6ImRhcmsiLCJwYW5lbCI6dHJ1ZSwibWluaUJpZyI6ZmFsc2UsImxlZ2VuZE1pbiI6ZmFsc2UsInNlY3MiOnsiY3VydmUiOnRydWUsInBvaW50cyI6dHJ1ZSwic2hhcGUiOnRydWUsInZpZXciOnRydWUsImluc3BlY3RvciI6dHJ1ZSwicmVsYXRpb25zIjp0cnVlLCJ0ZXN0IjpmYWxzZX19)

| curve | typed in P₁ | the message | open |
| --- | --- | --- | --- |
| secp256k1 (b = 7) | `020000000000000000000000000000000000000000000000000000000000000005` | x³+ax+b is a non-residue — this x lies on the quadratic twist, not the curve | [open](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoiazEtbmVnIiwiYSI6IjAiLCJiIjoiNyIsInAiOiIyXjI1NiAtIDJeMzIgLSA5NzciLCJnIjoiMDI3OWJlNjY3ZWY5ZGNiYmFjNTVhMDYyOTVjZTg3MGIwNzAyOWJmY2RiMmRjZTI4ZDk1OWYyODE1YjE2ZjgxNzk4IiwicDEiOiIwMjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDUiLCJwMiI6IiIsIm9wIjoiYWRkIiwic2hvd0ciOnRydWUsImZvcmNlIjpmYWxzZSwic2hhcGUiOiJ0b3J1cyIsIm1hcCI6InNjYWxlIiwiYml0cyI6MjQsInN1IjoyNCwic3YiOjE2LCJSIjoxLjIsInIiOjAuNDYsImdsYXNzIjowLjU1LCJiYWNrIjowLjQsInNob3ciOnsiZ3JpZCI6dHJ1ZSwicmluZ3MiOnRydWUsImxhYmVscyI6dHJ1ZSwiY2xvdWQiOnRydWUsImNob3JkIjp0cnVlLCJiZXRhIjpmYWxzZSwibWFwIjp0cnVlLCJzcGluIjpmYWxzZX0sInJpbmdzIjp7InAxIjp0cnVlLCJwMiI6dHJ1ZSwic3VtIjp0cnVlLCJnIjpmYWxzZX0sInRoZW1lIjoiZGFyayIsInBhbmVsIjp0cnVlLCJtaW5pQmlnIjpmYWxzZSwibGVnZW5kTWluIjpmYWxzZSwic2VjcyI6eyJjdXJ2ZSI6dHJ1ZSwicG9pbnRzIjp0cnVlLCJzaGFwZSI6dHJ1ZSwidmlldyI6dHJ1ZSwiaW5zcGVjdG9yIjp0cnVlLCJyZWxhdGlvbnMiOnRydWUsInRlc3QiOmZhbHNlfX0) |
| its twist (b = 7·3³) | `02000000000000000000000000000000000000000000000000000000000000000f` | compressed SEC, on the curve | [open](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoiazEtbmVnIiwiYSI6IjAiLCJiIjoiNyozXjMiLCJwIjoiMl4yNTYgLSAyXjMyIC0gOTc3IiwiZyI6IjAyMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwZiIsInAxIjoiMDIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDBmIiwicDIiOiIiLCJvcCI6ImFkZCIsInNob3dHIjp0cnVlLCJmb3JjZSI6ZmFsc2UsInNoYXBlIjoidG9ydXMiLCJtYXAiOiJzY2FsZSIsImJpdHMiOjI0LCJzdSI6MjQsInN2IjoxNiwiUiI6MS4yLCJyIjowLjQ2LCJnbGFzcyI6MC41NSwiYmFjayI6MC40LCJzaG93Ijp7ImdyaWQiOnRydWUsInJpbmdzIjp0cnVlLCJsYWJlbHMiOnRydWUsImNsb3VkIjp0cnVlLCJjaG9yZCI6dHJ1ZSwiYmV0YSI6ZmFsc2UsIm1hcCI6dHJ1ZSwic3BpbiI6ZmFsc2V9LCJyaW5ncyI6eyJwMSI6dHJ1ZSwicDIiOnRydWUsInN1bSI6dHJ1ZSwiZyI6ZmFsc2V9LCJ0aGVtZSI6ImRhcmsiLCJwYW5lbCI6dHJ1ZSwibWluaUJpZyI6ZmFsc2UsImxlZ2VuZE1pbiI6ZmFsc2UsInNlY3MiOnsiY3VydmUiOnRydWUsInBvaW50cyI6dHJ1ZSwic2hhcGUiOnRydWUsInZpZXciOnRydWUsImluc3BlY3RvciI6dHJ1ZSwicmVsYXRpb25zIjp0cnVlLCJ0ZXN0IjpmYWxzZX19) |

**Do it yourself**

1. In **Curve**, pick the preset **secp256k1: G and −G (mirror pair)**.
2. Type `7*3^3` in **b**, `02000000000000000000000000000000000000000000000000000000000000000f` in **P₁** and `02000000000000000000000000000000000000000000000000000000000000000f` in **Generator G**.
3. Empty **P₂**.
4. Read the **Points** section in the panel.

**Look at:** with b = `7*3^3`, `02` followed by x = 15 is “compressed SEC, on the curve”; the curve is no longer named,
and #E is “not counted (p above 2²²)”. The table puts both inputs side by side.

**Why:** an x-only scalar multiplication that never computes y (a Montgomery-style ladder) cannot tell E from E′:
fed an x on the twist, it silently computes on E′. Protocols that take x-only inputs therefore need the twist to be
secure as well, or must check that x is on E, as every Bitcoin decoder does when it lifts x.

## Try it yourself

- On F₂₂₃, type b = `7*2^3`: is 2 a square mod 223? Compare #E with 252.
- Check #E + #E′ = 2p + 2 on F₉₇ for y² = x³ + 2x + 3 (a ≠ 0: the twist is y² = x³ + 2d²x + 3d³).
- On the twist of F₂₂₃, find the three points with y = 0: their x are 3 times those of E’s.

## Recap

- E′: y² = x³ + ad²x + bd³ with d a non-square; every x lies on E or (scaled by d) on E′, or on both when f(x) = 0.
- #E + #E′ = 2p + 2, so the traces are opposite.
- The “quadratic twist” error names exactly this: the x you typed belongs to E′.

Next: [45 Invalid-curve attacks](45-invalid-curve-attacks.md).
