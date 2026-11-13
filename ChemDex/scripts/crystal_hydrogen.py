"""Read reported coreCIF hydrogen bonds without guessing donor/acceptor chemistry.

IUCr geom_hbond labels and symmetry codes define the triplets. All source
space-group operations are applied to those triplets, preserving translations.
Geometry checks allow printed rounding, not experimental standard uncertainty.
"""
import math
import re
import gemmi

PREFIX = '_geom_hbond_'


def _rounding(raw, coordinate=False):
    value = re.sub(r'\(\d+\)', '', gemmi.cif.as_string(raw)).lower()
    mantissa, _, exponent = value.partition('e')
    if coordinate and '.' not in mantissa and not exponent:
        return 0.0  # exact integer/special-position coordinate
    places = len(mantissa.partition('.')[2])
    return .5 * 10 ** (int(exponent or 0) - places)


def published_hydrogen_bonds(block, unit, operators, atoms):
    def column(name):
        return list(block.find_values(PREFIX + name))

    donors = column('atom_site_label_D')
    if not donors:
        return None
    count = len(donors)
    columns = {name: column(name) for name in (
        'atom_site_label_D', 'atom_site_label_H', 'atom_site_label_A',
        'site_symmetry_D', 'site_symmetry_H', 'site_symmetry_A',
        'distance_DH', 'distance_HA', 'distance_DA', 'angle_DHA')}
    if any(len(values) != count for values in columns.values() if values):
        raise ValueError('Inconsistent hydrogen-bond table columns')
    if any(not columns['atom_site_label_' + part] for part in 'DHA'):
        raise ValueError('Hydrogen-bond table requires D, H and A labels')
    ids = [gemmi.cif.as_string(v) for v in (list(block.find_values('_space_group_symop_id')) or list(block.find_values('_symmetry_equiv_pos_site_id')))]
    if ids and (len(ids) != len(operators) or len(set(ids)) != len(ids)):
        raise ValueError('Ambiguous symmetry operation identifiers')
    operation_ids = dict(zip(ids or map(str, range(1, len(operators) + 1)), operators))
    sites = {}
    orthogonalization = unit.orth.mat.tolist()
    labels = list(block.find_values('_atom_site_label'))
    coordinates = [list(block.find_values('_atom_site_fract_' + axis)) for axis in 'xyz']
    for i, raw_label in enumerate(labels):
        label = gemmi.cif.as_string(raw_label)
        if label in sites:
            raise ValueError('Ambiguous atom-site label in hydrogen-bond source')
        raw = [axis[i] for axis in coordinates]
        rounding = [_rounding(v, coordinate=True) for v in raw]
        error = math.hypot(*(sum(abs(orthogonalization[row][col]) * rounding[col] for col in range(3)) for row in range(3)))
        sites[label] = ([gemmi.cif.as_number(v) for v in raw], error)

    def symmetry_position(frac, code):
        if code == '.':
            return frac
        match = re.fullmatch(r'(\d+)(?:_(\d{3}))?', code)
        if not match or match[1] not in operation_ids:
            raise ValueError('Unknown hydrogen-bond symmetry code: ' + code)
        translation = [int(v) - 5 for v in match[2]] if match[2] else [0, 0, 0]
        return [v + translation[i] for i, v in enumerate(operation_ids[match[1]].apply_to_xyz(frac))]

    def atom_image(frac, label):
        matches = [(i, [round(v - atom['fractional'][k]) for k, v in enumerate(frac)])
                   for i, atom in enumerate(atoms) if atom['label'] == label
                   and all(abs((v - atom['fractional'][k]) - round(v - atom['fractional'][k])) < 1e-7 for k, v in enumerate(frac))]
        if len(matches) != 1:
            raise ValueError('Hydrogen-bond site does not map uniquely to the expanded crystal: ' + label)
        return matches[0]

    rows, edges, seen = [], [], set()
    for row_index in range(count):
        row = {name: gemmi.cif.as_string(values[row_index]) if values else None for name, values in columns.items()}
        positions, errors = [], []
        for part in 'DHA':
            label = row['atom_site_label_' + part]
            if label not in sites:
                raise ValueError('Missing hydrogen-bond atom-site label: ' + label)
            frac, error = sites[label]
            positions.append(symmetry_position(frac, row['site_symmetry_' + part] or '.'))
            errors.append(error)
        cart = [list(unit.orthogonalize(gemmi.Fractional(*f))) for f in positions]
        dh = math.dist(cart[0], cart[1]); ha = math.dist(cart[1], cart[2]); da = math.dist(cart[0], cart[2])
        if min(dh, ha, da) < 1e-6:
            raise ValueError('Coincident atoms in reported hydrogen bond')
        angle = math.degrees(math.acos(max(-1, min(1, sum((cart[0][k] - cart[1][k]) * (cart[2][k] - cart[1][k]) for k in range(3)) / (dh * ha)))))
        angle_error = math.degrees(math.asin(min(1, (errors[0] + errors[1]) / dh)) + math.asin(min(1, (errors[1] + errors[2]) / ha)))
        for name, actual, error in [('distance_DH', dh, errors[0] + errors[1]), ('distance_HA', ha, errors[1] + errors[2]), ('distance_DA', da, errors[0] + errors[2]), ('angle_DHA', angle, angle_error)]:
            raw = row[name]
            if raw not in (None, '.', '?'):
                expected = gemmi.cif.as_number(raw)
                if not math.isfinite(expected) or abs(actual - expected) > _rounding(raw) + error + (1e-3 if name == 'angle_DHA' else 1e-4):
                    raise ValueError('Reported hydrogen-bond geometry disagrees with coordinates: ' + name)
        rows.append({'labels': [row['atom_site_label_' + p] for p in 'DHA'], 'symmetry': [row['site_symmetry_' + p] or '.' for p in 'DHA'],
                     'reported': {name: row[name] for name in ('distance_DH', 'distance_HA', 'distance_DA', 'angle_DHA')},
                     'calculated': {'distanceDH': dh, 'distanceHA': ha, 'distanceDA': da, 'angleDHA': angle}})
        for operation in operators:
            mapped = [atom_image(operation.apply_to_xyz(frac), row['atom_site_label_' + part]) for frac, part in zip(positions, 'DHA')]
            (d, ds), (h, hs), (a, acs) = mapped
            if atoms[h]['element'] != 'H' or atoms[d]['element'] == 'H' or atoms[a]['element'] == 'H':
                raise ValueError('Reported hydrogen-bond labels do not identify a D-H-A triplet')
            donor_shift = [v - hs[i] for i, v in enumerate(ds)]
            acceptor_shift = [v - hs[i] for i, v in enumerate(acs)]
            key = (d, *donor_shift, h, a, *acceptor_shift)
            if key in seen:
                continue
            seen.add(key)
            edges.append({'a': h, 'b': a, 'shift': acceptor_shift, 'donor': d, 'donorShift': donor_shift,
                          'distance': ha, 'donorAcceptorDistance': da, 'angle': angle, 'sourceRow': row_index})
    return {'origin': 'source-cif', 'category': 'geom_hbond', 'rows': rows, 'edges': edges}
