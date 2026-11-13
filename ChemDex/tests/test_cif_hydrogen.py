import math
from pathlib import Path
import sys
import unittest
import gemmi

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from crystal_hydrogen import published_hydrogen_bonds

METHANOL = (ROOT / 'assets/periodic-table/crystals/cod-4503066.cif').read_text(encoding='utf-8')


def compile_geometry(text):
    block = gemmi.cif.read_string(text).sole_block()
    small = gemmi.make_small_structure_from_block(block)
    operators = [gemmi.Op(v) for v in small.symops] if small.symops else list(small.spacegroup.operations())
    atoms = [{'label': s.label, 'element': s.element.name, 'fractional': [v % 1 for v in s.fract]} for s in small.get_all_unit_cell_sites()]
    return published_hydrogen_bonds(block, small.cell, operators, atoms)


def edge_keys(geometry):
    return sorted((e['donor'], *e['donorShift'], e['a'], e['b'], *e['shift']) for e in geometry['edges'])


class PublishedHydrogenTests(unittest.TestCase):
    def test_original_methanol_table_expands_all_four_donors(self):
        geometry = compile_geometry(METHANOL)
        self.assertEqual(geometry['origin'], 'source-cif')
        self.assertEqual(len(geometry['edges']), 4)
        row = geometry['rows'][0]
        self.assertEqual(row['symmetry'], ['.', '.', '4_557'])
        self.assertEqual(row['reported']['distance_DA'], '2.6929(11)')
        self.assertAlmostEqual(row['calculated']['distanceDA'], 2.6929, places=4)
        self.assertAlmostEqual(row['calculated']['angleDHA'], 174.1, places=1)
        self.assertEqual(len(set(e['donor'] for e in geometry['edges'])), 4)

    def test_nonsequential_symmetry_ids_are_ids_not_array_offsets(self):
        text = METHANOL.replace('_symmetry_equiv_pos_as_xyz\n', '_symmetry_equiv_pos_site_id\n_symmetry_equiv_pos_as_xyz\n')
        for n, expression in enumerate(["'x, y, z'", "'-x+1/2, -y, z+1/2'", "'-x, y+1/2, -z+1/2'", "'x+1/2, -y+1/2, -z'"], 1):
            text = text.replace(expression, str(n * 11) + ' ' + expression)
        text = text.replace('174.1 4_557', '174.1 44_557')
        self.assertEqual(edge_keys(compile_geometry(text)), edge_keys(compile_geometry(METHANOL)))

    def test_donor_and_hydrogen_symmetry_codes_are_applied_too(self):
        text = METHANOL.replace('_geom_hbond_site_symmetry_A\n', '_geom_hbond_site_symmetry_D\n_geom_hbond_site_symmetry_H\n_geom_hbond_site_symmetry_A\n')
        text = text.replace('174.1 4_557', '174.1 2_555 2_555 3_547')
        self.assertEqual(edge_keys(compile_geometry(text)), edge_keys(compile_geometry(METHANOL)))

    def test_missing_or_wrong_labels_and_unknown_symmetry_fail(self):
        for old, new in [('O1 H1 O1 0.84', 'O9 H1 O1 0.84'), ('4_557', '?'), ('4_557', '9_555')]:
            with self.subTest(new=new), self.assertRaises(ValueError):
                compile_geometry(METHANOL.replace(old, new))

    def test_wrong_cell_translation_and_inconsistent_reported_geometry_fail(self):
        for old, new in [('4_557', '4_555'), ('2.6929(11)', '2.8929(11)'), ('174.1 4_557', '140.0 4_557'), ('O1 H1 O1 0.84', 'O1 H1 O1 0.95')]:
            with self.subTest(new=new), self.assertRaises(ValueError):
                compile_geometry(METHANOL.replace(old, new))

    def test_duplicate_source_rows_do_not_duplicate_periodic_edges(self):
        row = 'O1 H1 O1 0.84 1.86 2.6929(11) 174.1 4_557'
        geometry = compile_geometry(METHANOL.replace(row, row + '\n' + row))
        self.assertEqual(len(geometry['rows']), 2)
        self.assertEqual(len(geometry['edges']), 4)

    def test_source_triplets_are_not_filtered_by_water_only_cutoffs(self):
        # Synthetic source table tests the parser contract, not a new material.
        text = '''data_test
_cell_length_a 10
_cell_length_b 10
_cell_length_c 10
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 90
_symmetry_space_group_name_H-M 'P 1'
loop_
_symmetry_equiv_pos_as_xyz
'x,y,z'
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C .1000 .1000 .1000
H1 H .2000 .1000 .1000
O1 O .3700 .3000 .1000
loop_
_geom_hbond_atom_site_label_D
_geom_hbond_atom_site_label_H
_geom_hbond_atom_site_label_A
C1 H1 O1
'''
        geometry = compile_geometry(text)
        self.assertEqual(len(geometry['edges']), 1)
        edge = geometry['edges'][0]
        self.assertGreater(edge['donorAcceptorDistance'], 3)
        self.assertLess(edge['angle'], 150)
        self.assertAlmostEqual(edge['distance'], math.sqrt(1.7 ** 2 + 2 ** 2))
        with self.assertRaises(ValueError):
            compile_geometry(text.replace('C1 H1 O1\n', 'C1 C1 O1\n'))

    def test_no_table_means_no_reported_hydrogen_bonds(self):
        text = (ROOT / 'assets/periodic-table/crystals/cod-4504310.cif').read_text(encoding='utf-8')
        self.assertIsNone(compile_geometry(text))


if __name__ == '__main__':
    unittest.main()
