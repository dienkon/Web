export interface SetupPageItem {
  num: number;
  title: string;
  key: string;
}

export const SETUP_PAGES: SetupPageItem[][] = [
  // Page 1
  [
    { num: 1, title: "1: Input/Output", key: "INPUT_OUTPUT" },
    { num: 2, title: "2: Angle Unit", key: "ANGLE_UNIT" },
    { num: 3, title: "3: Number Format", key: "NUMBER_FORMAT" },
    { num: 4, title: "4: Engineer Symbol", key: "ENGINEER_SYMBOL" },
  ],
  // Page 2
  [
    { num: 1, title: "1: Fraction Result", key: "FRACTION_RESULT" },
    { num: 2, title: "2: Complex", key: "COMPLEX_FORMAT" },
    { num: 3, title: "3: Statistics", key: "STATISTICS_FREQ" },
    { num: 4, title: "4: Equation/Func", key: "EQUATION_COMPLEX" },
  ],
  // Page 3
  [
    { num: 1, title: "1: Table", key: "TABLE_FUNC" },
    { num: 2, title: "2: Recurring Dec", key: "RECURRING_DECIMAL" },
    { num: 3, title: "3: Decimal Mark", key: "DECIMAL_MARK" },
    { num: 4, title: "4: Digit Separator", key: "DIGIT_SEPARATOR" },
  ],
];
