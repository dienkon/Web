"""Regression cases from actual source mistakes, not a copy of the importer."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts/periodic_review'))
from chemistry import check_equation


class ConservationTests(unittest.TestCase):
    def test_charge_cannot_be_ignored_for_gold(self):
        self.assertEqual(check_equation('2Au³⁺ + 3Fe²⁺ → 2Au + 3Fe³⁺')['delta'], {'charge': -3.0})
        self.assertEqual(check_equation('Au³⁺ + 3Fe²⁺ → Au + 3Fe³⁺')['status'], 'balanced')

    def test_nuclear_charge_and_mass_are_both_required(self):
        self.assertEqual(check_equation('²³⁵U + ¹n → ⁹⁹Tc + ¹³⁴Sn + 3¹n')['delta'], {'Z': 1.0})
        self.assertEqual(check_equation('²⁴⁸Ca + ²⁴⁹Cf → ²⁹⁴Og + 3n')['delta'], {'A': -200.0})
        self.assertEqual(check_equation('⁴⁸Ca + ²⁴⁹Cf → ²⁹⁴Og + 3¹n')['status'], 'balanced')

    def test_missing_sulfur_is_not_fixed_by_cosmetic_balancing(self):
        result = check_equation('4Ag₂S + 8NaCN + O₂ + 2H₂O → 8Na[Ag(CN)₂] + 4NaOH')
        self.assertIn('S', result['delta'])

    def test_complexes_and_phase_labels_are_preserved(self):
        for eq in ['Ni²⁺ + 2C₄H₈N₂O₂ + 2OH⁻ → Ni(C₄H₇N₂O₂)₂↓ + 2H₂O',
                   '2NaCl(l) → 2Na(l) + Cl₂(g)', 'He* + He → He₂* + hν']:
            self.assertEqual(check_equation(eq)['status'], 'balanced', eq)

    def test_symbolic_process_is_not_a_balanced_chemical_equation(self):
        self.assertEqual(check_equation('I₂ + Starch → phức màu xanh tím')['status'], 'unparsed')
        self.assertEqual(check_equation('¹⁴⁶Nd + n → ¹⁴⁷Nd → ¹⁴⁷Pm + β⁻')['status'], 'schematic')


if __name__ == '__main__': unittest.main()
