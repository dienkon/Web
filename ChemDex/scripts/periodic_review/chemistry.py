"""Strict conservation checks for chemical, ionic and nuclear source equations.

Conservation is necessary, not proof of chemical feasibility. Reactions with
unconfirmed products need an explicit editorial correction or exclusion.
"""
import re
from collections import Counter
from fractions import Fraction

SUB = str.maketrans('₀₁₂₃₄₅₆₇₈₉', '0123456789')
SUP = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻', '0123456789+-')
SYMBOLS = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta T W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.replace('Ta T W', 'Ta W').split()
Z = {s: i + 1 for i, s in enumerate(SYMBOLS)}
Z['D'] = Z['T'] = 1


def formula(text):
    text = text.translate(SUB)
    tokens = re.findall(r'[A-Z][a-z]?|\d+|[()\[\]]', text)
    if ''.join(tokens) != text:
        raise ValueError('Unrecognised formula: ' + text)
    pos = 0

    def group(close=None):
        nonlocal pos
        out = Counter()
        while pos < len(tokens) and tokens[pos] != close:
            token = tokens[pos]
            pos += 1
            if token in ('(', '['):
                nested = group(')' if token == '(' else ']')
            elif token in Z:
                nested = Counter({token: 1})
            else:
                raise ValueError('Unexpected token: ' + token)
            n = int(tokens[pos]) if pos < len(tokens) and tokens[pos].isdigit() else 1
            if pos < len(tokens) and tokens[pos].isdigit():
                pos += 1
            out.update({s: v * n for s, v in nested.items()})
        if close:
            if pos >= len(tokens):
                raise ValueError('Unclosed formula')
            pos += 1
        return out
    return group()


def species(text, nuclear=False):
    text = text.strip().replace('ν̅ₑ', 'νbar').replace('νₑ', 'ν').replace('ν̄ₑ', 'νbar')
    text = re.sub(r'\((?:s|l|g|aq|dd|r|k|đpnc)\)', '', text).replace('↑', '').replace('↓', '').strip()
    coefficient = re.match(r'^(\d+(?:/\d+)?|½)', text)
    n = Fraction(coefficient[0].replace('½', '1/2')) if coefficient else Fraction(1)
    if coefficient:
        text = text[coefficient.end():].strip()
    if nuclear:
        if text in ('γ', 'ν', 'νbar', 'hν'):
            counts = {'A': 0, 'Z': 0}
        elif text in ('e⁻', 'β⁻'):
            counts = {'A': 0, 'Z': -1}
        elif text in ('e⁺', 'β⁺'):
            counts = {'A': 0, 'Z': 1}
        elif text == 'α':
            counts = {'A': 4, 'Z': 2}
        elif text in ('n', '¹n'):
            counts = {'A': 1, 'Z': 0}
        else:
            m = re.fullmatch(r'([⁰¹²³⁴⁵⁶⁷⁸⁹]+)(?:ᵐ)?([A-Z][a-z]?)', text)
            if not m or m[2] not in Z:
                raise ValueError('Unrecognised nuclide: ' + text)
            counts = {'A': int(m[1].translate(SUP)), 'Z': Z[m[2]]}
    else:
        charge = re.search(r'([⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻])$', text)
        q = 0
        if charge:
            qtext = charge[0].translate(SUP)
            q = int(qtext[:-1] or '1') * (1 if qtext[-1] == '+' else -1)
            text = text[:charge.start()]
        if text in {'e', 'hν', 'năng lượng điện'}:
            counts = {}
        else:
            counts = dict(formula(text.replace('*', '')))
        counts['charge'] = q
    return n, counts


def check_equation(equation):
    nuclear = bool(re.search(r'[⁰¹²³⁴⁵⁶⁷⁸⁹]+(?:ᵐ)?[A-Z]', equation))
    sides = re.split(r'→|⇌|↔', equation)
    if len(sides) != 2:
        return {'status': 'schematic', 'reason': 'Not a single reaction equation'}
    delta = Counter()
    try:
        for side, sign in zip(sides, (-1, 1)):
            for term in re.split(r'\s+\+\s+', side.strip()):
                n, counts = species(term, nuclear)
                for s, v in counts.items():
                    delta[s] += sign * n * v
    except (ValueError, KeyError) as error:
        return {'status': 'unparsed', 'kind': 'nuclear' if nuclear else 'chemical', 'reason': str(error)}
    diff = {s: float(v) for s, v in delta.items() if v}
    return {'status': 'unbalanced' if diff else 'balanced', 'kind': 'nuclear' if nuclear else 'chemical', 'delta': diff}
