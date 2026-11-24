# 94 Glossary

The words these tutorials use, in alphabetical order, each with the chapter that explains it best. Names in **bold**
are labels the visualizer itself shows.

### Automorphism

A map from a curve to itself that respects the addition of points. Every curve has P ↦ ±P; curves with a = 0 and
p ≡ 1 (mod 3) have six, (x, y) ↦ (βⁱx, ±y). See [43](43-j-zero.md).

### Baby-step giant-step

The discrete-log method the visualizer uses on curves with p up to 2²²: store about √n multiples of G, then step from
the target point in jumps of √n·G until one matches. See [29](29-discrete-logs.md).

### β (beta) and λ (lambda)

β is a cube root of unity mod p (β³ = 1, β ≠ 1). On a curve with a = 0, (x, y) ↦ (βx, y) is an automorphism; on
secp256k1 it equals multiplication by λ, a cube root of unity mod n. The **β-orbit** switch (key **B**) draws (βx, y)
and (β²x, y). See [35](35-glv.md).

### b′ (b prime)

For a point (x, y) that is not on the curve, the b′ with y² = x³ + ax + b′: the curve the point really lies on. The
visualizer names it in the message and the Inspector. See [21](21-clock-arithmetic.md) and [36](36-invalid-points.md).

### BIP32, BIP340, BIP341

Bitcoin improvement proposals: hierarchical deterministic keys (child keys from a parent key and a chain code),
Schnorr signatures with x-only keys, and Taproot outputs (the tweak Q = P + tG). See [37](37-points-in-bitcoin.md).

### Chord and tangent

The line through two points of a curve (chord), or the line touching it at one point (tangent). It meets the curve in
one more point R, and the sum is −R. The **Chord construction** switch (key **K**) draws it. See [24](24-chord.md) and
[25](25-tangent.md).

### Cofactor

#E divided by the order of G: how many times larger the whole group is than the part G generates. 1 on secp256k1 and
P-256, 12 on F₂₂₃. See [28](28-orders-subgroups.md).

### Compressed key

A public key written as `02` or `03` followed by x: 33 bytes on secp256k1. The prefix says whether y is even (02) or
odd (03). See [33](33-key-formats.md) and [34](34-parity-taproot.md).

### Cusp and node

The two kinds of singular cubic: y² = x³ has a cusp at (0, 0), y² = x³ − 3x + 2 a node at (1, 0). The visualizer flags
them in the **Δ** row. See [46](46-singular-composite.md).

### Discrete logarithm

For points G and Q = kG, the number k. Easy to find on toy curves, infeasible on secp256k1: the basis of Bitcoin’s
security. See [29](29-discrete-logs.md) and [14](14-how-far-apart.md).

### Discriminant (Δ)

4a³ + 27b² (mod p). If it is 0 the cubic has a repeated root and the curve is singular, not an elliptic curve. See
[46](46-singular-composite.md).

### Elliptic curve

Here: the points (x, y) with y² = x³ + ax + b (mod p), together with the point at infinity, for a prime p and a
nonzero discriminant. Its points can be added, which makes them a group. See [21](21-clock-arithmetic.md).

### Finite field

A finite set of numbers in which you can add, subtract, multiply and divide (except by 0). The numbers 0 to p − 1 with
arithmetic mod a prime p form the field F_p. See [21](21-clock-arithmetic.md).

### Flat map

The panel in the corner of the view (“Flat torus”): the square [0, p) × [0, p) with x across and y up, the torus cut
open. ⤢ enlarges it. See [13](13-why-a-donut.md).

### Generator G

The fixed starting point of a curve’s public keys: a public key is kG. Every preset has one; the **Generator G** field
holds it. See [14](14-how-far-apart.md) and [32](32-private-to-public.md).

### Guide rings

The two rings through a point on the torus: around the tube (fixed x, a meridian) and around the hole (fixed y, a
parallel). See [13](13-why-a-donut.md).

### Hasse bound

For any elliptic curve over F_p, the trace t = p + 1 − #E satisfies |t| ≤ 2√p. The **trace** row checks it. See
[22](22-counting-points.md).

### Hybrid key

A public key written as `06` or `07`, x and y: the prefix repeats y’s parity. The visualizer flags a wrong parity bit.
See [33](33-key-formats.md).

### Invalid-curve attack

Sending a victim a point that is not on its curve but on another one with a small subgroup, so that the victim’s
secret leaks modulo the small order. Prevented by checking every received point. See [36](36-invalid-points.md) and
[45](45-invalid-curve-attacks.md).

### j-invariant

A number that classifies curves up to change of coordinates: j = 1728 · 4a³ / (4a³ + 27b²). j = 0 for every curve with
a = 0, including secp256k1. See [43](43-j-zero.md).

### Longitude and latitude

The angle around the vertical axis (longitude) and the angle north or south of the equator (latitude). On the sphere
x sets the longitude and y the latitude. See [14](14-how-far-apart.md).

### Mod p

Arithmetic in which only the remainder after division by p is kept: numbers on a clock with p hours. See
[21](21-clock-arithmetic.md).

### Negation

The mirror image of a point: −(x, y) = (x, p − y). P + (−P) is the point at infinity. See [15](15-mirror-images.md)
and [23](23-negation.md).

### Order

The order of a point P is the smallest n with nP = 𝒪. The order of a curve is its number of points, #E. See
[28](28-orders-subgroups.md).

### P-256

The NIST curve secp256r1, used in TLS and passkeys: a ≡ −3, prime order, no β. See [39](39-p256.md).

### Point at infinity

𝒪, the extra point of every elliptic curve, the zero of its addition: P + 𝒪 = P, and P + (−P) = 𝒪. It has no
coordinates and is never drawn; type `O` to use it. See [12](12-cloud-of-dots.md) and [23](23-negation.md).

### Private key

A number k from 1 to n − 1, kept secret. See [32](32-private-to-public.md).

### Public key

The point kG of a private key k, published as a SEC or x-only encoding. See [32](32-private-to-public.md) and
[33](33-key-formats.md).

### Quadratic twist

For a non-square d, the curve y² = x³ + ad²x + bd³. Every x is on the curve or, scaled by d, on its twist. See
[44](44-twists.md).

### Relations, Inspector, Curve facts

Three sections of the panel: how P₁ and P₂ relate, every detail of the last point hovered, and what the visualizer
works out about the curve. See [11](11-start-here.md).

### secp256k1

Bitcoin’s curve: y² = x³ + 7 over the prime p = 2²⁵⁶ − 2³² − 977, with prime order n. See
[31](31-secp256k1.md).

### SEC encoding

The standard ways to write a point as bytes: compressed (02/03), uncompressed (04), hybrid (06/07). See
[33](33-key-formats.md).

### Step

The **Step ▸** button (key **N**): puts the result into P₁ so the operation runs again. With P₂ = G it walks the
multiples of G. See [27](27-walking-multiples.md).

### Subgroup

A part of a group that is a group by itself, such as the multiples of G, written ⟨G⟩. See
[28](28-orders-subgroups.md).

### Supersingular

A curve whose trace is divisible by p; for p > 3 that means #E = p + 1. y² = x³ + b is supersingular when
p ≡ 2 (mod 3). See [43](43-j-zero.md).

### Torsion

The points of a given order or its divisors: the 2-torsion points are those with 2P = 𝒪 (y = 0), the 7-torsion those
with 7P = 𝒪. “Full” ℓ-torsion means all ℓ² of them are on the curve. See [23](23-negation.md) and
[42](42-group-structure.md).

### Torus

The surface of a donut. Points of a curve live on it because both coordinates wrap around at p. See
[13](13-why-a-donut.md).

### Trace

t = p + 1 − #E: how far the number of points is from p + 1. See [22](22-counting-points.md).

### x-only key

A public key written as its x coordinate alone (32 bytes on secp256k1), meaning the point with even y. Used by BIP340
and Taproot. See [34](34-parity-taproot.md).
