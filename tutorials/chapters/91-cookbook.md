# 91 Cookbook

One-line recipes. Each links to a worked example whose **Open this view** opens the visualizer in that
state; the example also lists the steps to do it by hand.

## Getting around

- See what each part of the screen does: [Example 11.1 · The screen as it opens](11-start-here.md#example-111--the-screen-as-it-opens).
- List every key: [Example 11.3 · The help dialog: every key](11-start-here.md#example-113--the-help-dialog-every-key).
- Pin a point and read all its details: [Example 11.4 · Hover and pin: the cards](11-start-here.md#example-114--hover-and-pin-the-cards).
- Start over, then **Self-test** → **Reset everything**: [Example 11.1 · The screen as it opens](11-start-here.md#example-111--the-screen-as-it-opens).

## Points and keys

- Put the public key of private key k on the torus: type `kG` into P₁: [Example 32.1 · Keys 1 to 5](32-private-to-public.md#example-321--keys-1-to-5).
- Put a public key on the torus: paste it (02/03, 04, 06/07, x-only or (x, y)) into P₁: [Example 33.1 · G in every format](33-key-formats.md#example-331--g-in-every-format).
- Show a key’s mirror image: the mirror button next to P₂: [Example 15.1 · The mirror button: P₂ = −P₁](15-mirror-images.md#example-151--the-mirror-button-p--p).
- Measure how far apart two points are: **Relations** → **Δu, Δv**: [Example 14.1 · Keys 2 and 3 on secp256k1](14-how-far-apart.md#example-141--keys-2-and-3-on-secp256k1).
- Check whether a point is on the curve: [Example 21.2 · A point that is not on the curve](21-clock-arithmetic.md#example-212--a-point-that-is-not-on-the-curve).
- See every point of a small curve: **All curve points** (C): [Example 12.1 · Every point of y² = x³ + 7 over F₂₂₃](12-cloud-of-dots.md#example-121--every-point-of-y--x--7-over-f).
- Learn a dot’s order and k: pin it, then **Use as P₁**: [Example 12.3 · Use as P₁: a dot’s order](12-cloud-of-dots.md#example-123--use-as-p-a-dots-order).
- Find the k of a point on a toy curve: [Example 29.1 · Every k on F₁₇](29-discrete-logs.md#example-291--every-k-on-f).
- See a key’s parity on the torus: the low-bits window: [Example 34.3 · The low-bits window shows parity](34-parity-taproot.md#example-343--the-low-bits-window-shows-parity).

## Operations

- Add two points and see the chord: [Example 24.1 · G + 8G = 9G: the chord winds three times](24-chord.md#example-241--g--8g--9g-the-chord-winds-three-times).
- Double a point: **2·P₁**: [Example 25.1 · Doubling (59, 32) on F₉₇: the tangent](25-tangent.md#example-251--doubling-59-32-on-f-the-tangent).
- Subtract: **P₁ − P₂**: [Example 26.1 · 7G − 2G = 5G on F₂₂₃](26-subtraction.md#example-261--7g--2g--5g-on-f).
- Walk G, 2G, 3G, …: P₂ = G and **N**: [Example 27.1 · Step: 5G, then N, gives 6G + G = 7G](27-walking-multiples.md#example-271--step-5g-then-n-gives-6g--g--7g).
- Walk the doublings: **2·P₁** and **N**: [Example 27.3 · The doubling walk: G, 2G, 4G, 8G, 16G, 11G](27-walking-multiples.md#example-273--the-doubling-walk-g-2g-4g-8g-16g-11g).
- See the GLV relation λ·P = (βx, y): [Example 35.1 · G, λG and λ²G share a y](35-glv.md#example-351--g-λg-and-λg-share-a-y).

## Curves

- Type your own curve: [Example 22.2 · Your own curve: y² = x³ + x + 1 over F₂₃](22-counting-points.md#example-222--your-own-curve-y--x--x--1-over-f).
- Read #E, the trace and the Hasse bound: [Example 22.1 · #E and the trace in Curve facts](22-counting-points.md#example-221--e-and-the-trace-in-curve-facts).
- Read secp256k1’s parameters in full: [Example 31.1 · The Curve facts of secp256k1](31-secp256k1.md#example-311--the-curve-facts-of-secp256k1).
- Compare with P-256: [Example 39.1 · The Curve facts of P-256](39-p256.md#example-391--the-curve-facts-of-p-256).
- Draw a curve’s quadratic twist: [Example 44.1 · The twist of F₂₂₃: y² = x³ + 189](44-twists.md#example-441--the-twist-of-f-y--x--189).
- See a curve that is not cyclic: [Example 28.3 · Not cyclic: a β-orbit outside ⟨G⟩](28-orders-subgroups.md#example-283--not-cyclic-a-β-orbit-outside-g).

## Shapes and pictures

- Switch shape: the **Shape** tiles or **S**: [Torus](16-nine-shapes.md#torus).
- See the donut cut open: enlarge the flat map (⤢): [Example 13.1 · The flat map is the donut cut open](13-why-a-donut.md#example-131--the-flat-map-is-the-donut-cut-open).
- Look from the top or the side: keys **2** and **3**: [Example 13.3 · From the side: y goes around the tube](13-why-a-donut.md#example-133--from-the-side-y-goes-around-the-tube).
- Paper theme for print: **T**: [Example 18.1 · The paper theme](18-make-it-look-right.md#example-181--the-paper-theme).
- Make a clean picture for slides: [Example 17.4 · A clean picture: panel hidden, legend compact](17-save-share-export.md#example-174--a-clean-picture-panel-hidden-legend-compact).
- Save a PNG or the JSON of every number: [Example 17.2 · Save the view as PNG](17-save-share-export.md#example-172--save-the-view-as-png).
- Share exactly this view: **Copy a link that restores this exact state**: [Example 17.1 · Copy link](17-save-share-export.md#example-171--copy-link).

## Bitcoin constructions

- Verify a BIP340 signature as a point equation: [Example 37.2 · Verifying BIP340: R + e·P = s·G](37-points-in-bitcoin.md#example-372--verifying-bip340-r--ep--sg).
- Apply a Taproot tweak: [Example 37.3 · The Taproot tweak: Q = P + t·G](37-points-in-bitcoin.md#example-373--the-taproot-tweak-q--p--tg).
- Derive a BIP32 child public key: [Example 37.4 · BIP32: K_child = K_parent + I_L·G](37-points-in-bitcoin.md#example-374--bip32-k_child--k_parent--i_lg).
- See why xpub + child key leaks the parent: [Example 37.5 · xpub + one child key = the parent key](37-points-in-bitcoin.md#example-375--xpub--one-child-key--the-parent-key).
- See what an off-curve point does: [Example 36.2 · Force group law: (1, 1) + G anyway](36-invalid-points.md#example-362--force-group-law-1-1--g-anyway).

## Research

- Read the group structure off the orders: [Example 42.1 · The structure of six toy curves](42-group-structure.md#example-421--the-structure-of-six-toy-curves).
- Run an invalid-curve attack on a toy curve: [Example 45.2 · The attacker’s view: 777·Q reveals 777 mod 13](45-invalid-curve-attacks.md#example-452--the-attackers-view-777q-reveals-777-mod-13).
- Drive the page from the console: [Example 48.1 · ecTorus.set: 5G + G on F₂₂₃](48-scripting.md#example-481--ectorusset-5g--g-on-f).
