# opentaxjs

opentaxjs is a JavaScript library designed to handle tax calculations based on predefined rules. It allows developers to implement tax logic in their applications using a structured, auditable, and maintainable rules format. While initially designed for the Philippine tax system, it can be extended to support other tax systems as well.

## Motivation
Stumbling upon the [tax directory subsite of BetterGov.ph](https://taxdirectory.bettergov.ph/), I noticed significant gaps and inconsistencies in its tax calculation feature. This is not an isolated issue; many similar websites and applications force developers to implement their own custom logic, which leads to problems with accuracy, consistency, and testability.

opentaxjs solves this by providing a unified, rules-based library for Philippine tax calculations. The goal is to provide a single, well-tested, and shareable set of rules so that developers no longer need to reinvent the wheel. This ensures calculations are accurate and makes it easier to implement and maintain tax features in any application.

## Project Goals
The project aims to:

1. **Create a rules format specification** that can be used to define tax rules in a structured way.
2. **Implement a JavaScript library** that can read these rules and perform tax calculations based on the provided data.
3. **Support a library of predefined tax rules** for common tax scenarios intended for the Philippine tax system, with the possibility of extending it to other tax systems in the future.

This project **DOES NOT** aim to:
1. Provide a complete tax filing solution.
2. Replace official tax filing systems or services.
3. Handle complex tax scenarios that require legal or financial advice.

## Features

- **Declarative tax rules**: Define complex tax logic in structured JSON format, separating tax calculations from application code for easier maintenance and updates
- **Built for accuracy**: Comprehensive validation, audit trails, and transparent calculations ensure your tax computations are correct and verifiable
- **Handle real-world complexity**: Progressive brackets, conditional logic, mid-period employment, and pro-rated calculations work out of the box
- **Developer-friendly**: TypeScript-first API with detailed error messages and comprehensive documentation gets you running quickly
- **Extensible by design**: Add new tax jurisdictions, rules, and scenarios without changing your application code

For more details on the project roadmap, please refer to [ROADMAP.md](ROADMAP.md)

## Installation

```bash
npm install opentaxjs
```

## Quick Start

```typescript
import opentax from 'opentaxjs';

const resp = await fetch(
  'https://cdn.jsdelivr.net/gh/nedpals/opentaxjs/rules/PH/income_tax.json'
);

const incomeTaxRule = await resp.json();
const calculator = opentax({ rule: incomeTaxRule });
const result = calculator.calculate({
  income_type: 'COMPENSATION',
  gross_compensation_income: 300_000,
  mandatory_contributions: 15_000,
  thirteenth_month_and_other_benefits: 25_000
});

console.log(result.liabilities);
// [
//   {
//     name: 'Annual Income Tax Filing',
//     type: 'annually',
//     iter: 1,
//     amount: 1500,
//     target_filing_date: 2026-04-14T16:00:00.000Z
//   }
// ]
```

## API Reference

### `opentax(config: OpenTaxConfig)`

Creates a new tax calculator instance.

**Parameters:**
- `config.rule`: A rule object conforming to the opentaxjs specification

**Returns:** `OpenTaxInstance`

### `calculate(inputs, options?)`

Performs tax calculation based on provided inputs.

**Parameters:**
- `inputs`: Object containing input values as defined in the rule
- `options?`: Optional period calculation options for mid-year scenarios
  - `start_date?: string` - Start date in YYYY-MM-DD format
  - `end_date?: string` - End date in YYYY-MM-DD format

**Returns:** `CalculationResult`
- `liability: number` - Total tax liability
- `liabilities: TaxLiability[]` - Filing schedule with amounts and dates
- `calculated: VariableMap` - All calculated values during execution
- `inputs: VariableMap` - Input values used in calculation
- `period?: PeriodInfo` - Period information for pro-rated calculations
- `debug?: object` - Debug information and execution context

## Advanced Usage

### Mid-Period Employment

```typescript
const result = calculator.calculate({
  gross_income: 300000,
  filing_status: 'single'
}, {
  start_date: "2024-03-15", // Started mid-March
  end_date: "2024-12-31"
});

// Automatically calculates pro-rated quarterly amounts
console.log(result.liabilities);
```

### Error Handling

```typescript
import { RuleValidationError } from 'opentaxjs';

try {
  const calculator = opentax({ rule: invalidRule });
} catch (error) {
  if (error instanceof RuleValidationError) {
    console.error('Rule validation failed:', error.issues);
  }
}
```

### Accessing Calculation Details

```typescript
const result = calculator.calculate(inputs);

// Access all calculated variables
console.log(result.calculated.taxable_income);

// Access debug information
console.log(result.debug?.context);

// Get filing schedule details
result.liabilities.forEach(liability => {
  console.log(`${liability.name}: ${liability.amount} due ${liability.target_filing_date}`);
});
```

## Creating Tax Rules

Tax rules are defined using JSON files that conform to the opentaxjs specification. Here's a minimal example:

```json
{
  "$version": "1.0.0",
  "name": "Simple Income Tax",
  "jurisdiction": "PH",
  "taxpayer_type": "INDIVIDUAL",
  "constants": {
    "tax_rate": 0.25,
    "exemption": 250000
  },
  "inputs": {
    "gross_income": {
      "type": "number",
      "description": "Annual gross income"
    }
  },
  "outputs": {
    "taxable_income": {
      "type": "number",
      "description": "Income subject to tax"
    }
  },
  "flow": [
    {
      "name": "Calculate taxable income",
      "operations": [
        {
          "type": "set",
          "target": "taxable_income",
          "value": "$gross_income"
        },
        {
          "type": "subtract",
          "target": "taxable_income",
          "value": "$$exemption"
        },
        {
          "type": "set",
          "target": "taxable_income",
          "value": "max(taxable_income, 0)"
        }
      ]
    },
    {
      "name": "Calculate tax liability",
      "operations": [
        {
          "type": "set",
          "target": "liability",
          "value": "taxable_income"
        },
        {
          "type": "multiply",
          "target": "liability",
          "value": "$$tax_rate"
        }
      ]
    }
  ]
}
```

For complete documentation on creating tax rules, see the [Rules Specification](RULES_SPEC.md).

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

```bash
git clone https://github.com/nedpals/opentaxjs.git
cd opentaxjs
npm install
npm run test
```

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details

---

(c) 2025 Ned Palacios
