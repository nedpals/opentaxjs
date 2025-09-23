# opentaxjs Rules Specification

> This document is still a work in progress.

This specification defines a standardized, human-readable format for expressing tax calculation rules that can be consistently implemented across different programming languages and applications.

### Target Audience

This specification is primarily intended for **implementers and contributors** to the opentaxjs ecosystem:
- **Library implementers** building opentaxjs rule engines in various programming languages
- **Rule authors** creating and maintaining tax calculation rules for specific jurisdictions
- **Contributors** developing tooling, validation, and supporting infrastructure for the opentaxjs format
- **Developers** integrating opentaxjs into their applications

## Table of Contents

1. [Overview](#1-overview)
2. [Features and Goals](#2-features-and-goals)
3. [Disclaimer](#3-disclaimer)
4. [Core Concepts](#4-core-concepts)
   - 4.1. [Rules](#41-rules)
   - 4.2. [Variables](#42-variables)
   - 4.3. [Constants](#43-constants)
   - 4.4. [Tables](#44-tables)
5. [Rules Format Structure](#5-rules-format-structure)
6. [Variable System](#6-variable-system)
   - 6.1. [Variable Declaration](#61-variable-declaration)
   - 6.2. [Variable Referencing System](#62-variable-referencing-system)
   - 6.3. [Special Variables](#63-special-variables)
7. [Filing Schedules](#7-filing-schedules)
8. [Conditional Rules](#8-conditional-rules)
9. [Expressions](#9-expressions)
10. [Operations](#10-operations)
    - 10.1. [Operation Types](#101-operation-types)
    - 10.2. [Operation Best Practices](#102-operation-best-practices)

## 1. Overview

The opentaxjs rules format is a JSON-based specification for expressing tax calculations in a standardized, declarative manner. This specification covers the complete structure and syntax needed to create tax calculation rules that are portable across different implementations and programming languages.

This document is organized into conceptual sections that build upon each other:
- **Core concepts** introduce the fundamental building blocks (rules, variables, constants, tables)
- **Structural sections** detail the JSON format and organization 
- **Operational sections** explain how calculations flow through conditions, expressions, and operations
- **Practical sections** cover filing schedules and implementation best practices

## 2. Features and Goals

1. **Human-readable while still machine-readable**: It should be designed to be easily understandable and modifiable by humans, while also being structured in a way that machines can easily parse and execute the rules.
2. **Auditable**: The rules should be structured in a way that allows for easy auditing and verification of the tax calculations, ensuring transparency and compliance with tax regulations.
3. **Extensible**: It should handle the different rules and scenarios that may arise in tax calculations, allowing for future extensions and modifications.
4. **Language and application-agnostic**: While the initial implementation is in JavaScript, it should be able to be adapted for use in other programming languages and applications beyond tax calculations (eg. generating tax documentations, automated tax filings, etc.)

## 3. Disclaimer

### It is NOT a perfect tax calculation format.

- It is designed to use existing infrastructure as much as possible such as the use of JSON, which is built into JavaScript and is available in many other programming languages.
- It does not cover all possible tax scenarios and rules, but it provides a foundation that can be extended to cover more complex cases.
- While we try to make it as human-readable as possible, it does not guarantee that non-technical users will be able to grasp and modify the rules without assistance. It is still recommended to have a basic understanding of the JSON data language to effectively work with this format.

In short, the opentaxjs rules format is designed to cover as many tax scenarios as possible in the most accessible way we can.

## 4. Core Concepts

### 4.1. Rules

Rules are complete, self-contained JSON documents that define how to calculate taxes for a specific jurisdiction, taxpayer type, and tax category. Each rule encompasses the entire tax calculation workflow—from input validation and constant definitions to mathematical operations, conditional logic, progressive tax brackets, and filing requirements. Rules serve as the authoritative source of tax calculation logic, separate from application code.

### 4.2. Variables

Variables are containers that hold values for calculations. They can be categorized into three types based on their source/authority:

1. **Inputs** (`$` Prefix): These are user-provided values that the taxpayer supplies when calculating tax. They represent data from the taxpayer's domain and are defined in the `inputs` section (e.g., `$gross_income`).

2. **Constants** (`$$` Prefix): These are law-defined fixed values that come from tax regulations and remain the same across calculations. They represent data from the legal/regulatory domain and are defined in the `constants` section (e.g., `$$tax_exempt_threshold`).

3. **Calculated Values** (No Prefix): These are values computed during the calculation flow, including both user-defined outputs and system-defined special variables. They represent data from the rule calculation domain (e.g., `taxable_income`, `liability`).

### 4.3. Constants

Constants are fixed values that are used throughout the rule set. They are defined once in the `constants` object and can be referenced in operations and conditions. Constants make rules more maintainable by centralizing values that may change when laws are updated.

### 4.4. Tables

Tables define structured data used for calculations, primarily progressive tax brackets and lookup tables. They provide a way to organize complex data structures that can be referenced in operations.

## 5. Rules Format Structure

A complete rule is a JSON object containing all the components needed for tax calculation. The following example demonstrates the key structure and features:

> **Example Note**: This is a demonstration of the format's capabilities, not actual calculation logic.

```json
{
  "$version": "1.0.0",
  "name": "Income Tax",
  "law_basis": "Republic Act No. 8424 (Tax Reform Act of 1997)",
  "effective_from": "2024-01-01",
  "jurisdiction": "PH",
  "taxpayer_type": "INDIVIDUAL",
  "category": "INCOME_TAX",
  "author": "Bureau of Internal Revenue",
  "constants": {
    "tax_exempt_threshold": 250000,
    "freelance_tax_rate": 0.08,
    "standard_deduction": 50000,
    "quarterly_filing_day": 15
  },
  "tables": [
    {
      "name": "income_tax_brackets",
      "brackets": [
        {
          "min": 0,
          "max": 250000,
          "rate": 0,
          "base_tax": 0
        },
        {
          "min": 250000,
          "max": 400000,
          "rate": 0.20,
          "base_tax": 0
        },
        {
          "min": 400000,
          "max": 800000,
          "rate": 0.25,
          "base_tax": 30000
        },
        {
          "min": 800000,
          "max": null,
          "rate": 0.32,
          "base_tax": 130000
        }
      ]
    }
  ],
  "inputs": {
    "gross_income": {
      "type": "number",
      "description": "The total income for the period"
    },
    "deductions": {
      "type": "number",
      "description": "Total deductions applicable to the income"
    },
    "is_freelance": {
      "type": "boolean",
      "description": "Indicates if the income is from freelance work"
    }
  },
  "outputs": {
    "cumulative_gross_income": {
      "type": "number",
      "description": "Cumulative gross income for the period"
    },
    "taxable_income": {
      "type": "number",
      "description": "Income subject to tax after deductions"
    }
  },
  "filing_schedules": [
    {
      "name": "Quarterly Income Tax Filing",
      "frequency": "quarterly",
      "filing_day": "$$quarterly_filing_day",
      "forms": {
        "primary": "1701Q",
        "attachments": [
          "Schedule 1 (Quarterly Income Statement)"
        ]
      }
    },
    {
      "name": "Annual Income Tax Filing",
      "frequency": "annual",
      "filing_day": 15,
      "when": {
        "diff(liability, $gross_income)": {
          "gt": 0
        }
      },
      "forms": {
        "primary": "1701",
        "attachments": [
          "Schedule 1 (Background Information)",
          "Schedule 2 (Itemized Deductions)"
        ]
      }
    }
  ],
  "flow": [
    {
      "name": "Calculate annual gross income",
      "operations": [
        {
          "type": "set",
          "target": "cumulative_gross_income",
          "value": "$gross_income"
        },
        {
          "type": "multiply",
          "target": "cumulative_gross_income",
          "value": 12
        }
      ]
    },
    {
      "name": "Calculate taxable income",
      "operations": [
        {
          "type": "set",
          "target": "taxable_income",
          "value": "cumulative_gross_income"
        },
        {
          "type": "subtract",
          "target": "taxable_income",
          "value": "$deductions"
        },
        {
          "type": "subtract",
          "target": "taxable_income",
          "value": "$$standard_deduction"
        },
        {
          "type": "max",
          "target": "taxable_income",
          "value": 0
        }
      ]
    },
    {
      "name": "Apply tax calculation",
      "cases": [
        {
          "when": {
            "is_freelance": {
              "eq": true
            }
          },
          "operations": [
            {
              "type": "set",
              "target": "liability",
              "value": "cumulative_gross_income"
            },
            {
              "type": "multiply",
              "target": "liability",
              "value": "$$freelance_tax_rate"
            }
          ]
        },
        {
          "when": {
            "is_freelance": {
              "eq": false
            }
          },
          "operations": [
            {
              "type": "lookup",
              "target": "liability",
              "table": "income_tax_brackets",
              "value": "taxable_income"
            }
          ]
        }
      ]
    },
    {
      "name": "Apply minimum tax exemption",
      "operations": [
        {
          "type": "min",
          "target": "liability",
          "value": "max(taxable_income, 0)"
        }
      ]
    }
  ]
}
```

### 5.1. Rule Structure Overview

A rule file contains these main sections:

#### Metadata Properties
- **`$version`**: Format version for compatibility checking
- **`name`**: Human-readable rule identifier  
- **`law_basis`**: Legal foundation reference
- **`effective_from`/`effective_to`**: Date validity range (ISO format)
- **`jurisdiction`**: Geographic scope (e.g., "PH", "US")
- **`taxpayer_type`**: Applicable taxpayer category ("INDIVIDUAL", "CORPORATION", etc.)
- **`category`**: Tax type ("INCOME_TAX", "VAT", etc.)
- **`author`**: Rule maintainer (optional)

#### Calculation Components
- **`constants`**: Law-defined fixed values (detailed in [Constants](#43-constants))
- **`tables`**: Progressive brackets and lookup data (detailed in [Tables](#44-tables))  
- **`inputs`**: Required taxpayer data (detailed in [Variables](#42-variables))
- **`outputs`**: Calculated results (detailed in [Variables](#42-variables))
- **`filing_schedules`**: Due dates and forms (detailed in [Filing Schedules](#7-filing-schedules))
- **`flow`**: Calculation sequence (detailed in [Operations](#10-operations))

## 6. Variable System

For the basic concepts of variables, constants, and tables, see [Core Concepts](#4-core-concepts). This section covers implementation details for working with variables.

### 6.1. Variable Declaration

Variables declared in the `inputs` and `outputs` sections use [JSON Schema](https://json-schema.org/) format for validation and documentation. This allows you to specify constraints and structure:

```json
{
  "type": "number",
  "description": "The total income for the period",
  "minimum": 0,
  "maximum": 1000000
}
```

**Common JSON Schema properties for variables:**
- `type`: Data type ("number", "string", "boolean", "array", "object")
- `description`: Human-readable explanation
- `minimum`/`maximum`: Numeric bounds
- `enum`: List of allowed values
- `pattern`: Regular expression for string validation

**Declaration Rules:**
- Variable names must not include prefixes (`$` or `$$`) in declarations
- Names should use lowercase with underscores (`tax_exempt_threshold`)
- Names must be unique within their section (inputs, outputs, constants)

### 6.2. Special Variables

Special variables are system-defined and available throughout the rule without explicit declaration:

- **`liability`**: The current tax liability being calculated. This variable holds the result of tax calculations at any point in the flow and serves as the primary output for most tax rules.

**Important Notes:**
- Special variables cannot be redeclared in rule files
- They have no prefix (part of the calculation domain)
- Attempting to declare them will result in validation errors

## 7. Filing Schedules

Filing schedules define when tax filings are due and specify the required forms and documentation.

### 7.1. Schedule Properties

Each filing schedule contains the following properties:

- **`name`**: The name of the filing schedule
- **`frequency`**: The frequency of the filing:
  - `quarterly`: Filing is due every quarter (every 3 months)
  - `annual`: Filing is due once a year
- **`filing_day`**: The day of the month when the filing is due (1-31). If the day exceeds the number of days in the month, it will be adjusted to the last day of the month
- **`when`**: Optional condition that determines when the filing schedule applies. This is an expression that can reference rule outputs. If this condition is not met, the filing schedule will not be applied
- **`forms`**: Object specifying required tax forms and supporting documents:
  - `primary`: The main form number required for the filing (e.g., "1701Q" for quarterly individual income tax)
  - `attachments`: Array of supporting documents or additional forms that must be submitted with the primary form

### Example Filing Schedule
```json
{
  "name": "Quarterly Income Tax Filing",
  "frequency": "quarterly",
  "filing_day": 15,
  "when": {
    "diff(liability, $gross_income)": {
      "gt": 0
    }
  },
  "forms": {
    "primary": "1701Q",
    "attachments": [
      "Schedule 1 (Income Statement)",
      "Schedule 2 (Deductions)",
      "Supporting receipts"
    ]
  }
}
```

### Forms Object

The `forms` object provides detailed information about the required documentation for tax filings:

#### Primary Form
The `primary` field specifies the main tax form that must be filed. This is typically a government-issued form number that taxpayers need to complete and submit.

**Examples:**
- `"1701Q"`: Quarterly Individual Income Tax Return (Philippines)
- `"1701"`: Annual Individual Income Tax Return (Philippines)
- `"1702Q"`: Quarterly Corporate Income Tax Return (Philippines)

#### Attachments
The `attachments` field is an array of supporting documents, schedules, or additional forms that must accompany the primary form. This can include:

- **Supporting schedules**: Additional computation sheets or detailed breakdowns
- **Documentation requirements**: Receipts, certificates, or other supporting evidence
- **Additional forms**: Supplementary tax forms required for specific situations

**Example with multiple filing schedules:**
```json
"filing_schedules": [
  {
    "name": "Quarterly Income Tax Filing",
    "frequency": "quarterly",
    "filing_day": 15,
    "forms": {
      "primary": "1701Q",
      "attachments": [
        "Schedule 1 (Quarterly Income Statement)",
        "Schedule 7A (Creditable Withholding Tax)"
      ]
    }
  },
  {
    "name": "Annual Income Tax Filing",
    "frequency": "annual",
    "filing_day": 15,
    "when": {
      "diff(liability, $gross_income)": {
        "gt": 0
      }
    },
    "forms": {
      "primary": "1701",
      "attachments": [
        "Schedule 1 (Background Information)",
        "Schedule 2 (Itemized Deductions)",
        "Schedule 7A (Creditable Withholding Tax)",
        "Supporting receipts for deductions",
        "Certificate of Compensation Payment (BIR Form 2316)"
      ]
    }
  }
]
```

## 8. Conditional Rules

Conditional rules allows you to run specific operations or schedules based on certain conditions. This is useful for handling different scenarios in tax calculations, such as different tax rates for different income levels or requirement-specific cases.

At its core, a conditional rule is an `object` that contains the expression to be evaluated and the expected value to compare against, by explicitly telling the operator to use and the value to compare. For example:

```json
"cumulative_gross_income": {
  "lt": 250000
}
```

In this case `cumulative_gross_income` is the variable being evaluated, `lt` is the operator (less than), and `250000` is the value to compare against.

### 8.1. Operators

Each rule must have an operator that defines how the condition is evaluated. The operator is a string that specifies the type of comparison to be made. They are case-sensitive and the value can be a number, string, or boolean depending on the context of the variable being evaluated.

The following operators can be used in conditional rules:
- `eq`: Equal to
- `ne`: Not equal to
- `gt`: Greater than
- `lt`: Less than
- `gte`: Greater than or equal to
- `lte`: Less than or equal to

## 9. Expressions

Expressions are used in conditional rules and operations to reference variables and perform calculations. They provide a way to dynamically compute values and make decisions based on the current state of variables.

### 9.1. Variable References

Variables in expressions follow the same referencing system described in [Variables](#42-variables). Use the appropriate prefix based on the variable's source domain:

- **Inputs**: `$gross_income`, `$deductions`
- **Constants**: `$$tax_exempt_threshold`, `$$standard_deduction`  
- **Outputs/Special**: `taxable_income`, `liability`

Expressions can also include **function calls** that operate on variables:
```json
"diff(liability, $gross_income)"
```

### 9.2. Built-in Functions

The following built-in functions are available for use in expressions:

- `diff(a, b)`: Returns the absolute difference between two values `|a - b|`
- `sum(a, b, ...)`: Returns the sum of all provided values
- `max(a, b, ...)`: Returns the maximum value among the provided values
- `min(a, b, ...)`: Returns the minimum value among the provided values
- `round(value, decimals?)`: Rounds a value to the specified number of decimal places (default: 0)

### 9.3. Expression Examples

```json
{
  "when": {
    "sum($gross_income, $additional_income)": {
      "gt": "$$tax_exempt_threshold"
    }
  }
}
```

```json
{
  "when": {
    "diff(liability, 0)": {
      "gt": 1000
    }
  }
}
```

## 10. Operations

Operations define the actions that can be performed on variables during tax calculations. They are the building blocks of the calculation flow and allow you to manipulate values, perform arithmetic, and store results.

### Defining an Operation

Each operation is a JSON object that specifies the action to be performed. All operations have a `type` property that defines the kind of operation, and most have a `target` property that specifies which variable to modify.

Basic operation structure:
```json
{
  "type": "operation_type",
  "target": "variable_name",
  "value": "value_or_expression"
}
```

### 10.1. Operation Types

The following operation types are supported:

#### `set`
Sets a variable to a specific value. This completely replaces the current value of the target variable.

```json
{
  "type": "set",
  "target": "taxable_income",
  "value": "$gross_income"
}
```

```json
{
  "type": "set",
  "target": "liability",
  "value": 0
}
```

#### `add`
Adds a value to the target variable. The target variable must already have a numeric value.

```json
{
  "type": "add",
  "target": "total_deductions",
  "value": 50000
}
```

#### `subtract` / `deduct`
Subtracts a value from the target variable. Both `subtract` and `deduct` perform the same operation.

```json
{
  "type": "deduct",
  "target": "taxable_income",
  "value": "$total_deductions"
}
```

```json
{
  "type": "subtract",
  "target": "liability",
  "value": "withholding_tax"
}
```

#### `multiply`
Multiplies the target variable by a value. Commonly used for applying tax rates.

```json
{
  "type": "multiply",
  "target": "liability",
  "value": "$$tax_rate"
}
```

#### `divide`
Divides the target variable by a value.

```json
{
  "type": "divide",
  "target": "monthly_income",
  "value": "$$months_per_year"
}
```

#### `min`
Sets the target variable to the minimum value between its current value and the specified value.

```json
{
  "type": "min",
  "target": "liability",
  "value": "$$maximum_tax_cap"
}
```

#### `max`
Sets the target variable to the maximum value between its current value and the specified value.

```json
{
  "type": "max",
  "target": "taxable_income",
  "value": 0
}
```

#### `lookup`
Calculates a value based on a table lookup, primarily used for progressive tax brackets. This operation finds the appropriate bracket for the given value and calculates the tax based on the bracket structure.

```json
{
  "type": "lookup",
  "target": "liability",
  "table": "income_tax_brackets",
  "value": "taxable_income"
}
```

The lookup operation works by:
1. Finding the bracket where `value` falls between `min` and `max`
2. Calculating the tax for the amount within that bracket using the bracket's `rate`
3. Adding the `base_tax` from lower brackets
4. Setting the result to the target variable

**Example calculation:**
- If `taxable_income` is 500,000 and falls in the 400,000+ bracket (25% rate, 30,000 base tax)
- Tax = 30,000 + (500,000 - 400,000) × 0.25 = 55,000

### Using Expressions in Operations

Operations can use expressions and function calls in their `value` property:

```json
{
  "type": "set",
  "target": "adjusted_income",
  "value": "max($gross_income - $deductions, 0)"
}
```

```json
{
  "type": "multiply",
  "target": "liability",
  "value": "sum($$base_rate, $$additional_rate)"
}
```

### 10.2. Operation Best Practices

When writing operations, follow these best practices to ensure clarity and maintainability:

#### Use Descriptive Variable Names
Choose variable names that clearly describe what they represent:

```json
// Good
{
  "type": "set",
  "target": "taxable_income",
  "value": "gross_income"
}

// Avoid
{
  "type": "set",
  "target": "temp_var",
  "value": "gross_income"
}
```

#### Group Related Operations
Organize operations into logical steps within the flow:

```json
{
  "name": "Calculate taxable income",
  "operations": [
    {
      "type": "set",
      "target": "taxable_income",
      "value": "$gross_income"
    },
    {
      "type": "deduct",
      "target": "taxable_income",
      "value": "$$standard_deduction"
    },
    {
      "type": "max",
      "target": "taxable_income",
      "value": 0
    }
  ]
}
```

#### Initialize Variables Before Use
Always initialize variables before performing calculations:

```json
{
  "name": "Initialize liability calculation",
  "operations": [
    {
      "type": "set",
      "target": "liability",
      "value": 0
    }
  ]
}
```

#### Use Meaningful Step Names
Give each step in the flow a clear, descriptive name:

```json
{
  "name": "Apply progressive tax brackets",
  "operations": [...]
},
{
  "name": "Calculate withholding tax credit",
  "operations": [...]
}
```

#### Handle Edge Cases
Use conditional cases to handle different scenarios:

```json
{
  "name": "Apply tax rate based on income level",
  "cases": [
    {
      "when": {
        "taxable_income": {
          "lte": "$$tax_exempt_threshold"
        }
      },
      "operations": [
        {
          "type": "set",
          "target": "liability",
          "value": 0
        }
      ]
    },
    {
      "when": {
        "taxable_income": {
          "gt": "$$tax_exempt_threshold"
        }
      },
      "operations": [
        {
          "type": "set",
          "target": "liability",
          "value": "taxable_income"
        },
        {
          "type": "deduct",
          "target": "liability",
          "value": "$$tax_exempt_threshold"
        },
        {
          "type": "multiply",
          "target": "liability",
          "value": "$$basic_tax_rate"
        }
      ]
    }
  ]
}
