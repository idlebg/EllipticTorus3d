"""Independent reference for the torus visualizer's EC engine.

Big curves: scalar multiples come from OpenSSL (pyca/cryptography).
Small curves: brute-force arithmetic written separately from the JS engine,
with sympy for primality / square roots.
"""
import json, sys, hashlib
from collections import Counter
from sympy import isprime, sqrt_mod, factorint
from cryptography.hazmat.primitives.asymmetric import ec

SECP256K1 = dict(
    p=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F, a=0, b=7,
    gx=0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798,
    gy=0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8,
    n=0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141,
    beta=0x7AE96A2B657C07106E64479EAC3434E99CF0497512F58995C1396C28719501EE,
    lam=0x5363AD4CC05C30E0A5261C028812645A122E22EA20816678DF02967C1B23BD72,
)
P256 = dict(
    p=0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF,
    b=0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B,
    gx=0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
    gy=0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5,
    n=0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551,
)
P256['a'] = P256['p'] - 3


def ossl(curve, k):
    pub = ec.derive_private_key(k, curve).public_key().public_numbers()
    return pub.x, pub.y


def on_curve(c, x, y):
    return (y * y - (x ** 3 + c['a'] * x + c['b'])) % c['p'] == 0


# ---- small-curve arithmetic (independent implementation) ----
def add(c, P, Q):
    p, a = c['p'], c['a']
    if P is None: return Q
    if Q is None: return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0: return None
    if P == Q:
        m = (3 * P[0] * P[0] + a) * pow(2 * P[1], -1, p) % p
    else:
        m = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
    x3 = (m * m - P[0] - Q[0]) % p
    return (x3, (m * (P[0] - x3) - P[1]) % p)


def mul(c, k, P):
    R = None
    for _ in range(k):
        R = add(c, R, P)
    return R


def points(c):
    p = c['p']
    out = []
    for x in range(p):
        rhs = (x ** 3 + c['a'] * x + c['b']) % p
        for y in sorted(set(sqrt_mod(rhs, p, all_roots=True) or [])):
            out.append((x, y))
    return out


def order(c, P, N):
    k, Q = 1, P
    while Q is not None:
        Q = add(c, Q, P); k += 1
        if k > N + 1: raise RuntimeError('order overflow')
    return k


def points_sha256(pts):
    """sha256 of the sorted affine points as 'x,y\\n' lines (decimal): one compact value for the whole set."""
    return hashlib.sha256(''.join(f'{x},{y}\n' for x, y in sorted(pts)).encode()).hexdigest()


def small_report(name, p, a, b, G=None):
    c = dict(p=p, a=a, b=b)
    pts = points(c)
    N = len(pts) + 1
    rep = dict(name=name, p=p, a=a, b=b, prime=isprime(p), count=N, factors={str(k): v for k, v in factorint(N).items()},
               p_mod_3=p % 3, p_mod_4=p % 4, p_mod_8=p % 8)
    orders = {P: order(c, P, N) for P in pts}
    best = max(pts, key=lambda P: (orders[P], -P[0], -P[1])) if pts else None
    rep['max_order_point'] = best
    rep['max_order'] = orders[best] if best else None
    rep['points_sha256'] = points_sha256(pts)
    rep['order_hist'] = {str(k): v for k, v in sorted(Counter(orders.values()).items())}
    rep['two_torsion'] = [P for P in pts if P[1] == 0]
    if G:
        rep['G'] = G
        rep['ordG'] = order(c, G, N)
        rep['multiples'] = [mul(c, k, G) for k in range(1, min(rep['ordG'], 25) + 1)]
        # every point whose order divides ord(G), with k such that kG = P, or None when P is not in <G>
        # (on a non-cyclic group the order test alone does not decide membership)
        kof, R = {}, None
        for k in range(1, rep['ordG']):
            R = add(c, R, G); kof[R] = k
        rep['dlog_table'] = [[P[0], P[1], kof.get(P)] for P in sorted(pts) if rep['ordG'] % orders[P] == 0]
    return rep


def leading_zero_point(curve, n_bytes=32):
    """Smallest k whose k·G has an x coordinate with a leading zero byte (x < 2^248), from OpenSSL."""
    k = 1
    while True:
        x, y = ossl(curve, k)
        if x < 1 << (8 * n_bytes - 8): return k, x, y
        k += 1


if __name__ == '__main__':
    out = {}
    k1 = SECP256K1
    assert isprime(k1['p']) and isprime(k1['n'])
    assert on_curve(k1, k1['gx'], k1['gy'])
    assert ossl(ec.SECP256K1(), 1) == (k1['gx'], k1['gy'])
    assert pow(k1['beta'], 3, k1['p']) == 1 and k1['beta'] != 1
    assert pow(k1['lam'], 3, k1['n']) == 1
    lamG = ossl(ec.SECP256K1(), k1['lam'])
    assert lamG == (k1['beta'] * k1['gx'] % k1['p'], k1['gy']), 'beta/lambda pairing'
    out['secp256k1'] = {f'{k}G': [hex(v) for v in ossl(ec.SECP256K1(), k)] for k in (2, 3, 5, 7)}
    out['secp256k1']['n-1G'] = [hex(v) for v in ossl(ec.SECP256K1(), k1['n'] - 1)]
    out['secp256k1']['lamG'] = [hex(v) for v in lamG]
    out['secp256k1']['lam2G'] = [hex(v) for v in ossl(ec.SECP256K1(), k1['lam'] ** 2 % k1['n'])]
    out['secp256k1']['p_mod_4'] = k1['p'] % 4
    c = P256
    assert isprime(c['p']) and isprime(c['n'])
    assert on_curve(c, c['gx'], c['gy'])
    assert ossl(ec.SECP256R1(), 1) == (c['gx'], c['gy'])
    out['p256'] = {f'{k}G': [hex(v) for v in ossl(ec.SECP256R1(), k)] for k in (2, 3)}
    out['p256']['p_mod_4'] = c['p'] % 4
    # x-only lift on P-256 picks the even y: the even-y point with x = x(2G)
    x2, y2 = ossl(ec.SECP256R1(), 2)
    out['p256']['x2G_even'] = [hex(x2), hex(y2 if y2 % 2 == 0 else c['p'] - y2)]
    # points whose x has a leading zero byte: SEC encodings must keep the 00 (fixed 32-byte fields)
    for key, curve in (('secp256k1', ec.SECP256K1()), ('p256', ec.SECP256R1())):
        k, x, y = leading_zero_point(curve)
        out[key]['leading_zero_x'] = {'k': k, 'xy': [hex(x), hex(y)], 'compressed': ('03' if y & 1 else '02') + format(x, '064x')}
    # j-invariant of P-256 is nonzero; secp256k1 j = 0
    out['toys'] = [
        small_report('pb223', 223, 0, 7, (47, 71)),
        small_report('t211', 211, 0, 7),
        small_report('corbellini97', 97, 2, 3, (3, 6)),
        small_report('t10009', 10009, 0, 7),
        small_report('t10007', 10007, 0, 7),
        small_report('t1009', 1009, 0, 7),
        small_report('t17', 17, 2, 2, (5, 1)),
    ]
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(newline='\n')  # LF even when redirected on Windows
    json.dump(out, sys.stdout, indent=1, default=str)
