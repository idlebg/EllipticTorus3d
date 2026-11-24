# 96 For teachers

Two ready-made sessions built from the examples of these tutorials: a 45-minute lesson for Levels 1 and 2, and a
90-minute workshop on Bitcoin keys for Level 3. Everything runs offline: copy the tutorials, with the visualizer exactly where it sits next to
them, to a USB stick or a shared drive, and every student opens `index.html` from there.

## Before the session

- Check that the visualizer opens on the classroom computers (any current browser with WebGL 2;
  [95 FAQ](95-faq.md#the-3d-view-is-black-or-missing) if the 3D view stays black).
- Opening an example replaces each student’s stored view; tell them so, and show **Reset everything** in
  **Self-test** ([11 Start here](11-start-here.md)).
- For printed handouts or slides, use the paper theme and **Save the view as PNG**
  ([Example 18.1 · The paper theme](18-make-it-look-right.md#example-181--the-paper-theme), [Example 17.2 · Save the view as PNG](17-save-share-export.md#example-172--save-the-view-as-png)).

## Lesson: points on a donut (45 minutes, Levels 1 and 2)

Goal: students see that a curve over a finite field is a set of points on a torus, check one point by hand, add two
points, and understand why reversing kG is hard.

| minutes | activity | example |
| --- | --- | --- |
| 0 to 5 | open the visualizer; name the parts of the screen | [Example 11.1 · The screen as it opens](11-start-here.md#example-111--the-screen-as-it-opens) |
| 5 to 15 | clock arithmetic: in pairs, check by hand that (47, 71) is on y² = x³ + 7 mod 223 | [Example 21.1 · G = (47, 71) is on y² = x³ + 7 over F₂₂₃](21-clock-arithmetic.md#example-211--g--47-71-is-on-y--x--7-over-f) |
| 15 to 25 | the cloud of dots, the flat map, and neighbours across the seam | [Example 12.1 · Every point of y² = x³ + 7 over F₂₂₃](12-cloud-of-dots.md#example-121--every-point-of-y--x--7-over-f), [Example 13.1 · The flat map is the donut cut open](13-why-a-donut.md#example-131--the-flat-map-is-the-donut-cut-open), [Example 13.4 · Neighbours across the x seam](13-why-a-donut.md#example-134--neighbours-across-the-x-seam) |
| 25 to 35 | mirror images, then G + 8G by hand (λ = 3) and on screen | [Example 15.1 · The mirror button: P₂ = −P₁](15-mirror-images.md#example-151--the-mirror-button-p--p), [Example 24.1 · G + 8G = 9G: the chord winds three times](24-chord.md#example-241--g--8g--9g-the-chord-winds-three-times) |
| 35 to 45 | walk G, 2G, 3G with **N**; why the position of kG hides k | [Example 27.1 · Step: 5G, then N, gives 6G + G = 7G](27-walking-multiples.md#example-271--step-5g-then-n-gives-6g--g--7g), [Example 14.3 · Neighbouring keys land far apart](14-how-far-apart.md#example-143--neighbouring-keys-land-far-apart) |

Exit question: “Your friend shows you a point Q on F₂₂₃ and says Q = kG. How would you find k? How would you find it
if the curve had 10⁷⁷ points?” ([29 Discrete logs](29-discrete-logs.md)).

Homework: Level 1 and 2 exercises from [92 Exercises](92-exercises.md); answers in [93](93-answers.md).

## Workshop: what a Bitcoin key is (90 minutes, Level 3)

Goal: participants can explain a public key as a point kG, read every encoding, and recognise three places where
Bitcoin adds points.

| minutes | activity | example |
| --- | --- | --- |
| 0 to 10 | secp256k1 in the panel: p, n, G, h = 1 | [Example 31.1 · The Curve facts of secp256k1](31-secp256k1.md#example-311--the-curve-facts-of-secp256k1) |
| 10 to 25 | private key → public key; keys add like their private keys | [Example 32.1 · Keys 1 to 5](32-private-to-public.md#example-321--keys-1-to-5), [Example 32.4 · Adding public keys adds private keys](32-private-to-public.md#example-324--adding-public-keys-adds-private-keys) |
| 25 to 40 | every encoding, and every error message | [Example 33.1 · G in every format](33-key-formats.md#example-331--g-in-every-format), [Example 33.2 · An x with no point: the quadratic twist](33-key-formats.md#example-332--an-x-with-no-point-the-quadratic-twist) |
| 40 to 50 | parity: 02/03, x-only keys | [Example 34.1 · Which prefix does kG get?](34-parity-taproot.md#example-341--which-prefix-does-kg-get), [Example 34.2 · x-only: the sign is dropped](34-parity-taproot.md#example-342--x-only-the-sign-is-dropped) |
| 50 to 60 | the GLV endomorphism: three keys on one ring | [Example 35.1 · G, λG and λ²G share a y](35-glv.md#example-351--g-λg-and-λg-share-a-y) |
| 60 to 70 | invalid points, and why nodes check every key | [Example 36.1 · (1, 1) is not on secp256k1](36-invalid-points.md#example-361--1-1-is-not-on-secp256k1), [Example 36.2 · Force group law: (1, 1) + G anyway](36-invalid-points.md#example-362--force-group-law-1-1--g-anyway) |
| 70 to 90 | BIP340 verification, the Taproot tweak, BIP32 and the xpub leak | [Example 37.2 · Verifying BIP340: R + e·P = s·G](37-points-in-bitcoin.md#example-372--verifying-bip340-r--ep--sg), [Example 37.3 · The Taproot tweak: Q = P + t·G](37-points-in-bitcoin.md#example-373--the-taproot-tweak-q--p--tg), [Example 37.5 · xpub + one child key = the parent key](37-points-in-bitcoin.md#example-375--xpub--one-child-key--the-parent-key) |

Discussion: “Which of today’s constructions would break if a wallet skipped the on-curve check?” Then the Level 3
exercises.

## Going further

- Researchers and advanced students: Level 4, starting with [41 The mapping](41-mapping.md).
- One-line recipes for building your own examples: [91 Cookbook](91-cookbook.md).
- Every example in one place, with filters by level: [All examples](../examples.html).
