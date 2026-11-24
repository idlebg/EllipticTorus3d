# Elliptic curve → torus: tutorials

[![Six of the nine shapes from the tutorials: the torus, the trefoil knot, the lemniscate, the icosahedron, the Klein bottle and the wavy plane](img/tutorials-card.jpg)](https://idlebg.com/idleGevrek/tutorials/)

Tutorials for **Elliptic curve → torus**, the single-file, offline visualizer of elliptic curves over finite fields
by Idle (idlebg.com). They show how to use it properly and what it can show, with many worked examples, for every
level: from no maths at all to Bitcoin keys and research on elliptic curves.

The visualizer draws the points of y² = x³ + ax + b over F_p on a donut (a torus) and on eight other shapes, with the
group law, negation as a mirror, the GLV endomorphism of Bitcoin’s curve, a flat map, orders and discrete logs on toy
curves, and every way of writing a public key.

## Four ways to read them

- **Online:** [idlebg.com/idleGevrek/tutorials](https://idlebg.com/idleGevrek/tutorials/), every page and screenshot; the examples open the visualizer on the same site.
- **In one file, offline:** [`elliptic_curve_torus_tutorials.html`](elliptic_curve_torus_tutorials.html) (14.2 MiB): every page, every screenshot and the visualizer in a single HTML file. GitHub shows HTML files as source, so use **Download raw file** on its page, then open the file in any current browser.
- **In a clone or a download of this repository:** open `tutorials/index.html`. The examples open `elliptic_curve_torus_visualizer_v3.html` at the top of the repository, so it all works offline.
- **Here on GitHub:** the chapters are Markdown and read well as they are; start at [11 Start here](chapters/11-start-here.md). There, **Open this view** opens the visualizer on idlebg.com.

## Where to start

| if you want to | read |
| --- | --- |
| just see what it does | 11 to 16: [Start here](chapters/11-start-here.md), [dots](chapters/12-cloud-of-dots.md), [donut](chapters/13-why-a-donut.md), [distance](chapters/14-how-far-apart.md), [mirror](chapters/15-mirror-images.md), [shapes](chapters/16-nine-shapes.md) |
| understand how Bitcoin keys work | 11, 13 to 15, then 31 to 36: [secp256k1](chapters/31-secp256k1.md), [private to public](chapters/32-private-to-public.md), [formats](chapters/33-key-formats.md), [parity](chapters/34-parity-taproot.md), [GLV](chapters/35-glv.md), [invalid points](chapters/36-invalid-points.md) |
| teach this | Level 1 and Level 2, then [96 For teachers](chapters/96-for-teachers.md) |
| research elliptic curves | [28](chapters/28-orders-subgroups.md) and [29](chapters/29-discrete-logs.md), then 41 to 49, from [The mapping](chapters/41-mapping.md) |

The four levels:

| level | for | assumes |
| --- | --- | --- |
| 1 Explorer | anyone curious | a browser and a mouse |
| 2 Learner | students, teachers, developers new to elliptic curves | school algebra; clock arithmetic is taught here |
| 3 Bitcoiner | Bitcoin users and developers | has heard of keys and addresses |
| 4 Researcher | mathematicians, cryptographers | groups and finite fields |

## Contents

### Level 1 · Explorer

| | |
| --- | --- |
| <a href="chapters/11-start-here.md"><img src="img/thumb/11-first-look.webp" width="200" alt="the visualizer as it first opens, with five numbered parts: 1 the panel, 2 the toolbar, 3 the legend, 4 the flat map, 5 the hints; the 3D view fills the rest"></a> | **[11 Start here](chapters/11-start-here.md)**<br>the screen, the mouse and keys, opening the examples · 4 examples |
| <a href="chapters/12-cloud-of-dots.md"><img src="img/thumb/12-f223-cloud.webp" width="200" alt="the F₂₂₃ curve: 251 dots on the torus, one of them, (78, 98), hovered with its card, and the Inspector listing its details"></a> | **[12 A curve is a cloud of dots](chapters/12-cloud-of-dots.md)**<br>every point of a small curve, cards, the Inspector · 5 examples |
| <a href="chapters/13-why-a-donut.md"><img src="img/thumb/13-flat-big.webp" width="200" alt="F₂₂₃ with G pinned on the torus, and the flat map enlarged: the same dots on a square, G marked on both"></a> | **[13 Why a donut](chapters/13-why-a-donut.md)**<br>numbers that wrap around, the flat map, guide rings · 5 examples |
| <a href="chapters/14-how-far-apart.md"><img src="img/thumb/14-keys-2-3.webp" width="200" alt="secp256k1 on the torus with P₁ = 2G and P₂ = 3G pinned, their guide rings, and the Relations section showing Δu and Δv"></a> | **[14 Two points: how far apart?](chapters/14-how-far-apart.md)**<br>“02 and 03” read three ways · 7 examples |
| <a href="chapters/15-mirror-images.md"><img src="img/thumb/15-neg-button.webp" width="200" alt="F₂₂₃ from the side: P₁ = 4G on top of the tube and P₂ = −P₁ = 17G straight below it, joined by their shared ring, and the Relations section"></a> | **[15 Mirror images: 02 and 03](chapters/15-mirror-images.md)**<br>every point and its mirror image, on every shape · 6 examples |
| <a href="chapters/16-nine-shapes.md"><img src="img/thumb/16-torus.webp" width="200" alt="the F₂₂₃ chord through G and 8G, with R and 9G, on the torus"></a> | **[16 One set of points, nine shapes](chapters/16-nine-shapes.md)**<br>the same points on all nine shapes · 9 examples |
| <a href="chapters/17-save-share-export.md"><img src="img/thumb/17-copy-link.webp" width="200" alt="the F₂₂₃ preset just after clicking Copy a link that restores this exact state: the toast says Copied"></a> | **[17 Save, share, export](chapters/17-save-share-export.md)**<br>links, PNG, JSON, what is remembered · 5 examples |
| <a href="chapters/18-make-it-look-right.md"><img src="img/thumb/18-paper.webp" width="200" alt="the F₂₂₃ chord on the torus in the paper theme: ink lines on a light background"></a> | **[18 Make it look right](chapters/18-make-it-look-right.md)**<br>theme, sizes, glass, grid, labels · 8 examples |

### Level 2 · Learner

| | |
| --- | --- |
| <a href="chapters/21-clock-arithmetic.md"><img src="img/thumb/21-on-curve.webp" width="200" alt="F₂₂₃ with only P₁ = (47, 71), the message “(x, y) pair, on the curve”, and the Curve facts"></a> | **[21 Clock arithmetic and the curve equation](chapters/21-clock-arithmetic.md)**<br>arithmetic mod p, and checking a point by hand · 3 examples |
| <a href="chapters/22-counting-points.md"><img src="img/thumb/22-facts.webp" width="200" alt="the Curve facts of the F₂₂₃ preset: #E = 252 = 2² · 3² · 7 and the trace t = −28 with the Hasse bound"></a> | **[22 Counting points](chapters/22-counting-points.md)**<br>#E, the trace, and a count by hand · 2 examples |
| <a href="chapters/23-negation.md"><img src="img/thumb/23-f17-pair.webp" width="200" alt="F₁₇ with P₁ = (7, 6) = 9G and P₂ = (7, 11) = 10G pinned, mirror images on one ring; the enlarged flat map shows every dot paired with its mirror"></a> | **[23 Negation](chapters/23-negation.md)**<br>−P = (x, p − y), and the points that are their own mirror image · 3 examples |
| <a href="chapters/24-chord.md"><img src="img/thumb/24-g-plus-8g.webp" width="200" alt="F₂₂₃: the line through G and 8G winding three times around the tube, its third point R = (69, 137) and the mirror step to 9G = (69, 86), pinned"></a> | **[24 Adding points: the chord](chapters/24-chord.md)**<br>adding two points, and why the line winds around the donut · 5 examples |
| <a href="chapters/25-tangent.md"><img src="img/thumb/25-f97.webp" width="200" alt="y² = x³ + 2x + 3 over F₉₇: the tangent at (59, 32) winding twice around the tube, R = (80, 87), and the result 2·(59, 32) = (80, 10)"></a> | **[25 Doubling: the tangent](chapters/25-tangent.md)**<br>adding a point to itself · 3 examples |
| <a href="chapters/26-subtraction.md"><img src="img/thumb/26-f223.webp" width="200" alt="F₂₂₃ with P₁ = 7G, P₂ = 2G and the operation P₁ − P₂: the result 5G = (126, 96), and the chord’s 223 points on the flat map"></a> | **[26 Subtraction](chapters/26-subtraction.md)**<br>subtracting is adding the mirror image · 3 examples |
| <a href="chapters/27-walking-multiples.md"><img src="img/thumb/27-step.webp" width="200" alt="F₂₂₃ after one Step from P₁ = 5G with P₂ = G: P₁ is now 6G = (139, 137) and the result 7G = (92, 47), both pinned"></a> | **[27 Walking the multiples](chapters/27-walking-multiples.md)**<br>Step through G, 2G, 3G, … and through the doublings · 3 examples |
| <a href="chapters/28-orders-subgroups.md"><img src="img/thumb/28-cofactor.webp" width="200" alt="F₂₂₃: G pinned, its card says order 21, while Curve facts count 252 points"></a> | **[28 Orders and subgroups](chapters/28-orders-subgroups.md)**<br>the order of a point, the subgroup of G, the cofactor · 4 examples |
| <a href="chapters/29-discrete-logs.md"><img src="img/thumb/29-f17.webp" width="200" alt="F₁₇: P₁ = (16, 4) is 13G, P₂ = (6, 3) is 2G, and their sum (3, 16) is 15G; three pinned cards"></a> | **[29 Discrete logs on toy curves](chapters/29-discrete-logs.md)**<br>finding k on small curves, and why not on Bitcoin’s · 3 examples |

### Level 3 · Bitcoiner

| | |
| --- | --- |
| <a href="chapters/31-secp256k1.md"><img src="img/thumb/31-facts.webp" width="200" alt="the Curve section of the opening view: secp256k1’s p, a and b, p mod 4 and 3, the named curve, Δ, j, n, h and β"></a> | **[31 secp256k1 in the panel](chapters/31-secp256k1.md)**<br>Bitcoin’s curve and what Curve facts say about it · 3 examples |
| <a href="chapters/32-private-to-public.md"><img src="img/thumb/32-small-keys.webp" width="200" alt="secp256k1 with P₁ = 3G pinned: its card says k = 3"></a> | **[32 Private key → public key](chapters/32-private-to-public.md)**<br>a private key k and its public key kG · 5 examples |
| <a href="chapters/33-key-formats.md"><img src="img/thumb/33-formats.webp" width="200" alt="secp256k1 with P₁ typed as G in the hybrid format with the wrong parity bit: read, drawn, and flagged in amber"></a> | **[33 Key formats](chapters/33-key-formats.md)**<br>SEC 02/03, 04 and 06/07, x-only, (x, y), and every error · 2 examples |
| <a href="chapters/34-parity-taproot.md"><img src="img/thumb/34-prefixes.webp" width="200" alt="secp256k1 with P₁ = 6G, whose y is odd: its public key starts with 03"></a> | **[34 Parity, 02/03 and Taproot](chapters/34-parity-taproot.md)**<br>one bit of y, and x-only keys · 3 examples |
| <a href="chapters/35-glv.md"><img src="img/thumb/35-glv-top.webp" width="200" alt="secp256k1 from the top with P₁ = G, P₂ = λG and the β-orbit rings: the three points of one parallel ring around the hole"></a> | **[35 The GLV endomorphism](chapters/35-glv.md)**<br>β, λ, and the six keys that share three x values · 5 examples |
| <a href="chapters/36-invalid-points.md"><img src="img/thumb/36-cusp.webp" width="200" alt="secp256k1 with P₁ = (1, 1), drawn dashed and flagged: it lies on y² = x³ (b′ = 0); the addition with G is skipped"></a> | **[36 Invalid points](chapters/36-invalid-points.md)**<br>points off the curve, Force group law, and why keys are checked · 4 examples |
| <a href="chapters/37-points-in-bitcoin.md"><img src="img/thumb/37-bip340-r.webp" width="200" alt="secp256k1 with P₁ = the r of BIP340 test vector 0, read as an x-only key: the nonce point R; P₂ = the vector’s public key, 3G"></a> | **[37 Where points appear in Bitcoin](chapters/37-points-in-bitcoin.md)**<br>BIP340 signatures, the Taproot tweak, BIP32 child keys · 5 examples |
| <a href="chapters/39-p256.md"><img src="img/thumb/39-facts.webp" width="200" alt="the Curve section of the P-256 preset: p, a ≡ −3, b, p mod 4 and 3, the named curve, j, n and h, and no β row"></a> | **[39 P-256 next to secp256k1](chapters/39-p256.md)**<br>the curve of TLS and passkeys, side by side with Bitcoin’s · 2 examples |

### Level 4 · Researcher

| | |
| --- | --- |
| <a href="chapters/41-mapping.md"><img src="img/thumb/41-wind-24.webp" width="200" alt="F₂₂₃: the chord through (0, 26) and (54, 207) with slope 24, drawn as one line winding 24 times around the tube"></a> | **[41 The mapping](chapters/41-mapping.md)**<br>how a point becomes a position, and what gets drawn · 4 examples |
| <a href="chapters/42-group-structure.md"><img src="img/thumb/42-full-7-torsion.webp" width="200" alt="y² = x³ + 7 over F₁₀₀₉ with P₁ = 21G and P₂ = (59, 184), two independent points of order 7, and their sum, also of order 7"></a> | **[42 Group structure](chapters/42-group-structure.md)**<br>Z/m × Z/mn, 2-torsion, groups that are not cyclic · 2 examples |
| <a href="chapters/43-j-zero.md"><img src="img/thumb/43-f211.webp" width="200" alt="y² = x³ + 7 over F₂₁₁ from the top: (3, 33) and (166, 33) with the β-orbit, and the chord along their shared ring"></a> | **[43 j = 0 and its automorphisms](chapters/43-j-zero.md)**<br>six automorphisms, and the supersingular case · 3 examples |
| <a href="chapters/44-twists.md"><img src="img/thumb/44-twist-f223.webp" width="200" alt="y² = x³ + 189 over F₂₂₃, the quadratic twist of the Programming Bitcoin curve: 195 dots, #E = 196 and trace +28"></a> | **[44 Quadratic twists](chapters/44-twists.md)**<br>every x is on the curve or on its twist · 2 examples |
| <a href="chapters/45-invalid-curve-attacks.md"><img src="img/thumb/45-victim.webp" width="200" alt="F₂₂₃ with Force group law: P₁ = P₂ = (15, 16), off the curve (b′ = 3), after eleven Steps: P₁ = 12·(15, 16) and the next addition gives 𝒪"></a> | **[45 Invalid-curve attacks](chapters/45-invalid-curve-attacks.md)**<br>how an unchecked point leaks a secret key · 3 examples |
| <a href="chapters/46-singular-composite.md"><img src="img/thumb/46-cusp.webp" width="200" alt="a = b = 0 over F₂₂₃: the facts say singular; (1, 1) + (4, 8) = (50, 182) is still computed"></a> | **[46 Singular curves and composite moduli](chapters/46-singular-composite.md)**<br>cusps, nodes, and Lenstra’s factoring idea · 3 examples |
| <a href="chapters/47-shapes-topology.md"><img src="img/thumb/47-poles.webp" width="200" alt="F₂₂₃ on the sphere from the side: 2G = (36, 111) at the north pole and −2G = (36, 112) at the south pole, neighbours on the torus"></a> | **[47 Shapes as topology](chapters/47-shapes-topology.md)**<br>which edges of the square each shape glues or cuts · 3 examples |
| <a href="chapters/48-scripting.md"><img src="img/thumb/48-set.webp" width="200" alt="the visualizer after ecTorus.set from the console: F₂₂₃ with P₁ = 5G, P₂ = G and the result 6G = (139, 137) pinned"></a> | **[48 Scripting with ecTorus](chapters/48-scripting.md)**<br>the console API and the whole engine · 2 examples |
| <a href="chapters/49-trusting-numbers.md"><img src="img/thumb/49-selftest.webp" width="200" alt="the Self-test section after Run self-test: 42 of 42 checks pass, each listed by name"></a> | **[49 Trusting the numbers](chapters/49-trusting-numbers.md)**<br>the self-test, and how every claim was checked · 1 example |

### Reference

| | |
| --- | --- |
|  | **[91 Cookbook](chapters/91-cookbook.md)**<br>one-line recipes |
|  | **[92 Exercises](chapters/92-exercises.md)**<br>exercises for every level |
| <a href="chapters/93-answers.md"><img src="img/thumb/93-checks.webp" width="200" alt="the answer to exercise 1: F₂₂₃ with P₁ = 5G = (126, 96)"></a> | **[93 Answers to the exercises](chapters/93-answers.md)**<br>the answers, with the ones the visualizer confirms · 1 example |
|  | **[94 Glossary](chapters/94-glossary.md)**<br>the words these tutorials use |
| <a href="chapters/95-faq.md"><img src="img/thumb/95-strings.webp" width="200" alt="the visualizer as it opens, the view every FAQ answer starts from"></a> | **[95 FAQ and troubleshooting](chapters/95-faq.md)**<br>short answers to common questions · 1 example |
|  | **[96 For teachers](chapters/96-for-teachers.md)**<br>a 45-minute lesson and a 90-minute workshop |

## How the examples are checked

Every number, point, key, order or count in these tutorials is computed, never typed from memory, and checked twice:

1. **The live visualizer must show it.** Each example is built by a script that opens the tutorials’ copy of the visualizer, sets
   the state the way a person would, and checks the claims of the text against what the page computes and shows
   (its model and the text of its panel) before it takes the screenshot.
2. **An independent computation must agree.** Toy curves are checked by brute force, written separately from the
   visualizer; Bitcoin’s curve secp256k1 by the idleCore library and by OpenSSL; P-256 by OpenSSL.

[49 Trusting the numbers](chapters/49-trusting-numbers.md)
shows how to redo any claim yourself.

In all: 40 pages, 132 examples with a screenshot and a link, 144 more table rows with a link of their own, and 875 checks against the live visualizer.

## Version

These tutorials were built and checked against the visualizer v3.2.2, the copy at the top of this repository, SHA-256 `57b068d91e8c227af4066da6425144163eff10a671ef9f3852e3b1fb32663370`. They are generated from their source by the release tool; do not edit these files by hand.
