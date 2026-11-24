# 37 Where points appear in Bitcoin

**Level 3 · Bitcoiner.** Three places where Bitcoin adds points, each redone in the visualizer with the official test
vectors: a BIP340 signature check, the BIP341 Taproot tweak, and BIP32 child keys, including why an xpub plus one
child private key gives away the parent key. Read first: [32 Private key → public key](32-private-to-public.md) and
[34 Parity, 02/03 and Taproot](34-parity-taproot.md).

All values below are from the BIP test vectors as the idleCore library carries them, recomputed by idleCore (the
signature is re-signed, the tweak re-hashed, the BIP32 keys re-derived and compared with the vectors’ xpub and xprv
strings). The private keys in them are published test data: never use them for funds.

## BIP340: a signature contains a point

A BIP340 signature is 64 bytes, (r, s). r is the x coordinate of the signer’s nonce point R = k·G, written x-only, and
s = k + e·d (mod n), where d is the private key and e a hash of (r, P, message). A verifier checks

  s·G = R + e·P.

Test vector 0 signs the all-zero message with d = 3, so P = 3G, x-only `f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9`. Its signature is
`e907831f80848d1069a5371b402410364bdf1c5f8307b0084c55f1ce2dca821525f66a4a85ea8b71e482a74f382d2ce5ebeee8fdb2172f477df4900d310536c0`:
r = `e907831f80848d1069a5371b402410364bdf1c5f8307b0084c55f1ce2dca8215`, s = `25f66a4a85ea8b71e482a74f382d2ce5ebeee8fdb2172f477df4900d310536c0`.

### Example 37.1 · A BIP340 signature’s r is a point

[![secp256k1 with P₁ = the r of BIP340 test vector 0, read as an x-only key: the nonce point R; P₂ = the vector’s public key, 3G](../img/37-bip340-r.webp)](../img/37-bip340-r.webp)

**Open this view:** [R and P of BIP340 vector 0](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoiazEtbmVnIiwiYSI6IjAiLCJiIjoiNyIsInAiOiIyXjI1NiAtIDJeMzIgLSA5NzciLCJnIjoiMDI3OWJlNjY3ZWY5ZGNiYmFjNTVhMDYyOTVjZTg3MGIwNzAyOWJmY2RiMmRjZTI4ZDk1OWYyODE1YjE2ZjgxNzk4IiwicDEiOiJlOTA3ODMxZjgwODQ4ZDEwNjlhNTM3MWI0MDI0MTAzNjRiZGYxYzVmODMwN2IwMDg0YzU1ZjFjZTJkY2E4MjE1IiwicDIiOiJmOTMwOGEwMTkyNThjMzEwNDkzNDRmODVmODlkNTIyOWI1MzFjODQ1ODM2Zjk5YjA4NjAxZjExM2JjZTAzNmY5Iiwib3AiOiJhZGQiLCJzaG93RyI6dHJ1ZSwiZm9yY2UiOmZhbHNlLCJzaGFwZSI6InRvcnVzIiwibWFwIjoic2NhbGUiLCJiaXRzIjoyNCwic3UiOjI0LCJzdiI6MTYsIlIiOjEuMiwiciI6MC40NiwiZ2xhc3MiOjAuNTUsImJhY2siOjAuNCwic2hvdyI6eyJncmlkIjp0cnVlLCJyaW5ncyI6dHJ1ZSwibGFiZWxzIjp0cnVlLCJjbG91ZCI6dHJ1ZSwiY2hvcmQiOnRydWUsImJldGEiOmZhbHNlLCJtYXAiOnRydWUsInNwaW4iOmZhbHNlfSwicmluZ3MiOnsicDEiOnRydWUsInAyIjp0cnVlLCJzdW0iOnRydWUsImciOmZhbHNlfSwidGhlbWUiOiJkYXJrIiwicGFuZWwiOnRydWUsIm1pbmlCaWciOmZhbHNlLCJsZWdlbmRNaW4iOmZhbHNlLCJzZWNzIjp7ImN1cnZlIjp0cnVlLCJwb2ludHMiOnRydWUsInNoYXBlIjp0cnVlLCJ2aWV3Ijp0cnVlLCJpbnNwZWN0b3IiOnRydWUsInJlbGF0aW9ucyI6dHJ1ZSwidGVzdCI6ZmFsc2V9fQ)

**Do it yourself**

1. In **Curve**, pick the preset **secp256k1: G and −G (mirror pair)**.
2. Type `e907831f80848d1069a5371b402410364bdf1c5f8307b0084c55f1ce2dca8215` in **P₁** and `f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9` in **P₂**.
3. In the 3D view, click P₁ and P₂ to pin their cards.
4. Read the **Points** section in the panel.

**Look at:** both inputs are read as “x-only (BIP340, even y), on the curve”: P₁ is the nonce point R, P₂ the public
key P = 3G.

**Why:** BIP340 makes the signer pick a nonce whose point has an even y, so r alone names R, exactly as an x-only key
names its point.

### Example 37.2 · Verifying BIP340: R + e·P = s·G

The challenge for this vector is e = `6bb6b93a91f2ecc0cd924f4f9baabb5e6eb21745bb00f2cebdaac908bb5d86ce`. Since P = 3G, e·P = (3e mod n)·G, and 3e mod n =
`43242bafb5d8c64268b6edeed300321c916768ea81ba3830792dfc8d61e25329`, so P₂ is typed as that number followed by `G`.

[![secp256k1 with P₁ = R and P₂ = e·P typed as (3e mod n)G: their sum is s·G, the check a verifier makes](../img/37-bip340-verify.webp)](../img/37-bip340-verify.webp)

**Open this view:** [R + e·P for BIP340 vector 0](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoiazEtbmVnIiwiYSI6IjAiLCJiIjoiNyIsInAiOiIyXjI1NiAtIDJeMzIgLSA5NzciLCJnIjoiMDI3OWJlNjY3ZWY5ZGNiYmFjNTVhMDYyOTVjZTg3MGIwNzAyOWJmY2RiMmRjZTI4ZDk1OWYyODE1YjE2ZjgxNzk4IiwicDEiOiJlOTA3ODMxZjgwODQ4ZDEwNjlhNTM3MWI0MDI0MTAzNjRiZGYxYzVmODMwN2IwMDg0YzU1ZjFjZTJkY2E4MjE1IiwicDIiOiIweDQzMjQyYmFmYjVkOGM2NDI2OGI2ZWRlZWQzMDAzMjFjOTE2NzY4ZWE4MWJhMzgzMDc5MmRmYzhkNjFlMjUzMjlHIiwib3AiOiJhZGQiLCJzaG93RyI6dHJ1ZSwiZm9yY2UiOmZhbHNlLCJzaGFwZSI6InRvcnVzIiwibWFwIjoic2NhbGUiLCJiaXRzIjoyNCwic3UiOjI0LCJzdiI6MTYsIlIiOjEuMiwiciI6MC40NiwiZ2xhc3MiOjAuNTUsImJhY2siOjAuNCwic2hvdyI6eyJncmlkIjp0cnVlLCJyaW5ncyI6dHJ1ZSwibGFiZWxzIjp0cnVlLCJjbG91ZCI6dHJ1ZSwiY2hvcmQiOnRydWUsImJldGEiOmZhbHNlLCJtYXAiOnRydWUsInNwaW4iOmZhbHNlfSwicmluZ3MiOnsicDEiOnRydWUsInAyIjp0cnVlLCJzdW0iOnRydWUsImciOmZhbHNlfSwidGhlbWUiOiJkYXJrIiwicGFuZWwiOnRydWUsIm1pbmlCaWciOmZhbHNlLCJsZWdlbmRNaW4iOmZhbHNlLCJzZWNzIjp7ImN1cnZlIjp0cnVlLCJwb2ludHMiOnRydWUsInNoYXBlIjp0cnVlLCJ2aWV3Ijp0cnVlLCJpbnNwZWN0b3IiOnRydWUsInJlbGF0aW9ucyI6dHJ1ZSwidGVzdCI6ZmFsc2V9fQ)

**Do it yourself**

1. In **Curve**, pick the preset **secp256k1: G and −G (mirror pair)**.
2. Type `e907831f80848d1069a5371b402410364bdf1c5f8307b0084c55f1ce2dca8215` in **P₁** and `0x43242bafb5d8c64268b6edeed300321c916768ea81ba3830792dfc8d61e25329G` in **P₂**.
3. In the 3D view, click the result to pin its card.
4. Read the **Relations** section in the panel.

**Look at:** Relations gives P₁ + P₂ = `03d4219d5bcf3d579f4947beb31afd48fc5db75f0134f5a095f3465dbc46f41ebd`, which is s·G: type `0x` + s + `G` into another field and compare.

**Why:** that equality is the whole of BIP340 verification. (Typing e·P as a multiple of G uses the private key 3,
which only a test vector reveals; a verifier computes e·P from P directly.)

## BIP341: the Taproot tweak

A Taproot output key is Q = P + t·G, where P is the internal key (x-only, even y) and t = H_TapTweak(P ‖ merkle root),
a tagged hash. For the key-path-only vector 0, the internal key is `d6889cb081036e0faefa3a35157ad71086b123b2b144b649798b494c300a961d`, the tweak
t = `b86e7be8f39bab32a6f2c0443abbc210f0edac0e2c53d501b36b64437d9c6c70`, and the output key x(Q) = `53a1f6e454df1aa2776a2814a721372d6258050de330b3c6d10ee8f4e0dda343`.

### Example 37.3 · The Taproot tweak: Q = P + t·G

[![secp256k1 with P₁ = the internal key of BIP341 vector 0 (x-only) and P₂ = t·G: their sum is the output key Q, with an odd y](../img/37-taproot.webp)](../img/37-taproot.webp)

**Open this view:** [BIP341 vector 0: P + tG](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoiazEtbmVnIiwiYSI6IjAiLCJiIjoiNyIsInAiOiIyXjI1NiAtIDJeMzIgLSA5NzciLCJnIjoiMDI3OWJlNjY3ZWY5ZGNiYmFjNTVhMDYyOTVjZTg3MGIwNzAyOWJmY2RiMmRjZTI4ZDk1OWYyODE1YjE2ZjgxNzk4IiwicDEiOiJkNjg4OWNiMDgxMDM2ZTBmYWVmYTNhMzUxNTdhZDcxMDg2YjEyM2IyYjE0NGI2NDk3OThiNDk0YzMwMGE5NjFkIiwicDIiOiIweGI4NmU3YmU4ZjM5YmFiMzJhNmYyYzA0NDNhYmJjMjEwZjBlZGFjMGUyYzUzZDUwMWIzNmI2NDQzN2Q5YzZjNzBHIiwib3AiOiJhZGQiLCJzaG93RyI6dHJ1ZSwiZm9yY2UiOmZhbHNlLCJzaGFwZSI6InRvcnVzIiwibWFwIjoic2NhbGUiLCJiaXRzIjoyNCwic3UiOjI0LCJzdiI6MTYsIlIiOjEuMiwiciI6MC40NiwiZ2xhc3MiOjAuNTUsImJhY2siOjAuNCwic2hvdyI6eyJncmlkIjp0cnVlLCJyaW5ncyI6dHJ1ZSwibGFiZWxzIjp0cnVlLCJjbG91ZCI6dHJ1ZSwiY2hvcmQiOnRydWUsImJldGEiOmZhbHNlLCJtYXAiOnRydWUsInNwaW4iOmZhbHNlfSwicmluZ3MiOnsicDEiOnRydWUsInAyIjp0cnVlLCJzdW0iOnRydWUsImciOmZhbHNlfSwidGhlbWUiOiJkYXJrIiwicGFuZWwiOnRydWUsIm1pbmlCaWciOmZhbHNlLCJsZWdlbmRNaW4iOmZhbHNlLCJzZWNzIjp7ImN1cnZlIjp0cnVlLCJwb2ludHMiOnRydWUsInNoYXBlIjp0cnVlLCJ2aWV3Ijp0cnVlLCJpbnNwZWN0b3IiOnRydWUsInJlbGF0aW9ucyI6dHJ1ZSwidGVzdCI6ZmFsc2V9fQ)

**Do it yourself**

1. In **Curve**, pick the preset **secp256k1: G and −G (mirror pair)**.
2. Type `d6889cb081036e0faefa3a35157ad71086b123b2b144b649798b494c300a961d` in **P₁** and `0xb86e7be8f39bab32a6f2c0443abbc210f0edac0e2c53d501b36b64437d9c6c70G` in **P₂**.
3. In the 3D view, click the result to pin its card.
4. Read the **Relations** section in the panel.

**Look at:** the sum in Relations, `0353a1f6e454df1aa2776a2814a721372d6258050de330b3c6d10ee8f4e0dda343`: its x is the vector’s output key, and its prefix `03` says Q has an
odd y.

**Why:** the output key goes on chain x-only, so the odd y is dropped there. It matters in two places: a key-path
signer must negate the tweaked private key so it matches the even-y point, and a script-path spend carries the parity
bit in its control block.

## BIP32: child keys are sums

For a non-hardened child, BIP32 computes I = HMAC-SHA512(chain code, K_parent ‖ index) and takes its left half I_L.
Then k_child = k_parent + I_L (mod n) and K_child = K_parent + I_L·G. Test vector 1 (seed `000102030405060708090a0b0c0d0e0f`), from m/0′ to
m/0′/1:

- K_parent (m/0′) = `035a784662a4a20a65bf6aab9ae98a6c068a81c52e4b032c0fb5400c706cfccc56`, from xpub `xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw`;
- I_L = `4eb9d78157bae7a24115001621c4d91e3a3110e11e143c5259eaa4e55c5ec4bf`;
- K_child (m/0′/1) = `03501e454bf00751f24b1b489aa925215d66af2234e3891c3b21a52bedb3cd711c`, xpub `xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ`.

### Example 37.4 · BIP32: K_child = K_parent + I_L·G

[![secp256k1 with P₁ = the public key of m/0′ in BIP32 test vector 1 and P₂ = I_L·G: their sum is the public key of m/0′/1](../img/37-bip32.webp)](../img/37-bip32.webp)

**Open this view:** [BIP32 vector 1: m/0′ → m/0′/1](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoiazEtbmVnIiwiYSI6IjAiLCJiIjoiNyIsInAiOiIyXjI1NiAtIDJeMzIgLSA5NzciLCJnIjoiMDI3OWJlNjY3ZWY5ZGNiYmFjNTVhMDYyOTVjZTg3MGIwNzAyOWJmY2RiMmRjZTI4ZDk1OWYyODE1YjE2ZjgxNzk4IiwicDEiOiIwMzVhNzg0NjYyYTRhMjBhNjViZjZhYWI5YWU5OGE2YzA2OGE4MWM1MmU0YjAzMmMwZmI1NDAwYzcwNmNmY2NjNTYiLCJwMiI6IjB4NGViOWQ3ODE1N2JhZTdhMjQxMTUwMDE2MjFjNGQ5MWUzYTMxMTBlMTFlMTQzYzUyNTllYWE0ZTU1YzVlYzRiZkciLCJvcCI6ImFkZCIsInNob3dHIjp0cnVlLCJmb3JjZSI6ZmFsc2UsInNoYXBlIjoidG9ydXMiLCJtYXAiOiJzY2FsZSIsImJpdHMiOjI0LCJzdSI6MjQsInN2IjoxNiwiUiI6MS4yLCJyIjowLjQ2LCJnbGFzcyI6MC41NSwiYmFjayI6MC40LCJzaG93Ijp7ImdyaWQiOnRydWUsInJpbmdzIjp0cnVlLCJsYWJlbHMiOnRydWUsImNsb3VkIjp0cnVlLCJjaG9yZCI6dHJ1ZSwiYmV0YSI6ZmFsc2UsIm1hcCI6dHJ1ZSwic3BpbiI6ZmFsc2V9LCJyaW5ncyI6eyJwMSI6dHJ1ZSwicDIiOnRydWUsInN1bSI6dHJ1ZSwiZyI6ZmFsc2V9LCJ0aGVtZSI6ImRhcmsiLCJwYW5lbCI6dHJ1ZSwibWluaUJpZyI6ZmFsc2UsImxlZ2VuZE1pbiI6ZmFsc2UsInNlY3MiOnsiY3VydmUiOnRydWUsInBvaW50cyI6dHJ1ZSwic2hhcGUiOnRydWUsInZpZXciOnRydWUsImluc3BlY3RvciI6dHJ1ZSwicmVsYXRpb25zIjp0cnVlLCJ0ZXN0IjpmYWxzZX19)

**Do it yourself**

1. In **Curve**, pick the preset **secp256k1: G and −G (mirror pair)**.
2. Type `035a784662a4a20a65bf6aab9ae98a6c068a81c52e4b032c0fb5400c706cfccc56` in **P₁** and `0x4eb9d78157bae7a24115001621c4d91e3a3110e11e143c5259eaa4e55c5ec4bfG` in **P₂**.
3. In the 3D view, click the result to pin its card.
4. Read the **Relations** section in the panel.

**Look at:** P₁ + P₂ in Relations is the child public key above.

**Why:** that is how a watch-only wallet derives receive addresses from an xpub: it needs the chain code (in the xpub)
and the parent public key, never a private key.

### Example 37.5 · xpub + one child key = the parent key

The child’s private key is k_child = `3c6cb8d0f6a264c91ea8b5030fadaa8e538b020f0a387421a12de9319dc93368`. Subtract I_L·G from k_child·G:

[![secp256k1 with P₁ = the child private key of m/0′/1 as kG and P₂ = I_L·G, subtracted: the result is the parent public key, and its card carries the parent private key](../img/37-bip32-leak.webp)](../img/37-bip32-leak.webp)

**Open this view:** [k_child − I_L for BIP32 vector 1](https://idlebg.com/idleGevrek/elliptic_curve_torus_visualizer_v3.html#s=eyJ2IjozLCJwcmVzZXQiOiJjdXN0b20iLCJiYXNlUHJlc2V0IjoiazEtbmVnIiwiYSI6IjAiLCJiIjoiNyIsInAiOiIyXjI1NiAtIDJeMzIgLSA5NzciLCJnIjoiMDI3OWJlNjY3ZWY5ZGNiYmFjNTVhMDYyOTVjZTg3MGIwNzAyOWJmY2RiMmRjZTI4ZDk1OWYyODE1YjE2ZjgxNzk4IiwicDEiOiIweDNjNmNiOGQwZjZhMjY0YzkxZWE4YjUwMzBmYWRhYThlNTM4YjAyMGYwYTM4NzQyMWExMmRlOTMxOWRjOTMzNjhHIiwicDIiOiIweDRlYjlkNzgxNTdiYWU3YTI0MTE1MDAxNjIxYzRkOTFlM2EzMTEwZTExZTE0M2M1MjU5ZWFhNGU1NWM1ZWM0YmZHIiwib3AiOiJzdWIiLCJzaG93RyI6dHJ1ZSwiZm9yY2UiOmZhbHNlLCJzaGFwZSI6InRvcnVzIiwibWFwIjoic2NhbGUiLCJiaXRzIjoyNCwic3UiOjI0LCJzdiI6MTYsIlIiOjEuMiwiciI6MC40NiwiZ2xhc3MiOjAuNTUsImJhY2siOjAuNCwic2hvdyI6eyJncmlkIjp0cnVlLCJyaW5ncyI6dHJ1ZSwibGFiZWxzIjp0cnVlLCJjbG91ZCI6dHJ1ZSwiY2hvcmQiOnRydWUsImJldGEiOmZhbHNlLCJtYXAiOnRydWUsInNwaW4iOmZhbHNlfSwicmluZ3MiOnsicDEiOnRydWUsInAyIjp0cnVlLCJzdW0iOnRydWUsImciOmZhbHNlfSwidGhlbWUiOiJkYXJrIiwicGFuZWwiOnRydWUsIm1pbmlCaWciOmZhbHNlLCJsZWdlbmRNaW4iOmZhbHNlLCJzZWNzIjp7ImN1cnZlIjp0cnVlLCJwb2ludHMiOnRydWUsInNoYXBlIjp0cnVlLCJ2aWV3Ijp0cnVlLCJpbnNwZWN0b3IiOnRydWUsInJlbGF0aW9ucyI6dHJ1ZSwidGVzdCI6ZmFsc2V9fQ)

**Do it yourself**

1. In **Curve**, pick the preset **secp256k1: G and −G (mirror pair)**.
2. Type `0x3c6cb8d0f6a264c91ea8b5030fadaa8e538b020f0a387421a12de9319dc93368G` in **P₁** and `0x4eb9d78157bae7a24115001621c4d91e3a3110e11e143c5259eaa4e55c5ec4bfG` in **P₂**.
3. Choose the operation **P₁ − P₂**.
4. In the 3D view, click the result to pin its card.
5. Read the **Relations** section in the panel.

**Look at:** **P₁ − P₂** is the parent public key, and the result’s card carries k = k_child − I_L, the parent private
key `edb2e14f9ee77d26dd93b4ecede8d16ed408ce149b6cd80b0715a2d911a0afea`.

**Why:** I_L is computable from the xpub alone, so anyone with the xpub and one non-hardened child private key gets the
parent private key by one subtraction, and with it every sibling key. That is why hardened derivation exists, and why
an xpub must be treated as private when any child key could leak.

## Try it yourself

- In Example 37.2, put s·G into P₂ (`0x` + s + `G`) and choose **P₁ − P₂**: the result is −e·P.
- In Example 37.3, choose **P₁ − P₂**: you get P − tG. Which prefix does it have?
- In Example 37.4, press **N** with P₂ unchanged: the result is K_parent + 2·I_L·G, which is not a BIP32 key.

## Recap

- BIP340: r is the x of a point R; verification is the point equation s·G = R + e·P.
- BIP341: the output key is the point sum Q = P + tG; its parity matters for signing and the control block.
- BIP32: K_child = K_parent + I_L·G, so an xpub plus one non-hardened child private key reveals the parent key.

Next: [39 P-256 next to secp256k1](39-p256.md).
