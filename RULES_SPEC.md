# opentaxjs Rules Specification

This document outlines the rules and structure for the opentaxjs rules file. Rules are a set of instructions that define how tax calculations should be performed.

## Features
1. **Human-readable while still machine-readable**: It should be designed to be easily understandable and modifiable by humans, while also being structured in a way that machines can easily parse and execute the rules.
2. **Auditable**: The rules should be structured in a way that allows for easy auditing and verification of the tax calculations, ensuring transparency and compliance with tax regulations.
3. **Extensible**: It should handle the different rules and scenarios that may arise in tax calculations, allowing for future extensions and modifications.
4. **Language and application-agnostic**: While the initial implementation is in JavaScript, it should be able to be adapted for use in other programming languages and applications beyond tax calculations (eg. generating tax documentations, automated tax filings, etc.)

## Disclaimer: It is NOT a perfect tax calculation format.
- It is designed to use existing infrastructure as much as possible such as the use of JSON, which is built into JavaScript and is available in many other programming languages.
- It does not cover all possible tax scenarios and rules, but it provides a foundation that can be extended to cover more complex cases.
- While we try to make it as human-readable as possible, it does not guarantee that non-technical users will be able to grasp and modify the rules without assistance. It is still recommended to have a basic understanding of the JSON data language to effectively work with this format.

In short, the opentaxjs rules format is designed to cover as many tax scenarios as possible in the most accessible way we can.

## Rules Format
> DISCLAIMER: This is not the actual calculation logic but only to demonstrate the kitchen sink features that is defined in the format.

```json
{
  "$version": "1.0.0",
  "name": "Income Tax",
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
    "cummulative_gross_income": {
      "type": "number",
      "description": "Cumulative gross income for the period"
    }
  },
  "filing_schedules": [
    {
      "name": "Quarterly Income Tax Filing",
      "frequency": "quarterly",
      "filing_day": 15
    },
    {
      "name": "Annual Income Tax Filing",
      "frequency": "annual",
      "filing_day": 15,
      "when": {
        "diff($liability, gross_income)": {
          "gt": 0
        }
      }
    }
  ],
  "flow": [
    {
      "name": "Calculate cummulative gross income",
      "operations": [
        {
          "type": "set",
          "target": "cummulative_gross_income",
          "value": "$gross_income"
        },
        {
          "type": "multiply",
          "target": "cummulative_gross_income",
          "value": 12
        }
      ]
    },
    {
      "name": "Tax exempt deduct",
      "cases": [
        {
          "when": {
            "$cummulative_gross_income": {
              "lt": 250000
            }
          },
          "operations": [
            {
              "type": "deduct",
              "target": "cummulative_gross_income",
              "value": 250000,
            }
          ]
        },
      ],
    },
    {
      "name": "Apply 8% tax rate",
      "when": {
        "is_freelance": {
          "eq": true
        }
      },
      "operations": [
        {
          "type": "set",
          "target": "$liability",
          "value": "cummulative_gross_income"
        },
        {
          "type": "multiply",
          "target": "$liability",
          "value": 0.08
        }
      ]
    },
  ]
}
```

A rules file is a JSON object that contains the following properties:
- `$version`: The version of the rules file format. This is used to ensure compatibility with the opentaxjs library.
- `name`: The name of the rule set. This is used to identify the rule set in the opentaxjs library.
- `inputs`: An object that defines the inputs required for the rule set. They follow the [JSON Schema](https://json-schema.org/) format, which is a standard for describing the structure of JSON data. Each input has a `type` and a `description`.
- `outputs`: An object that defines the outputs of the rule set. This is also in the [JSON Schema](https://json-schema.org/) format. Outputs are typically used to store intermediate results or final results of the calculations.
- `filing_schedules`: An array of objects that define the filing schedules for the rule set. Each object contains:
  - `name`: The name of the filing schedule.
  - `frequency`: The frequency of the filing (e.g., "quarterly", "annual").
  - `filing_day`: The day of the month when the filing is due.
  - `when`: An optional condition that determines when the filing schedule should be applied. This is an expression that can reference the outputs of the rule set.
- `flow`: An array of objects that define the flow of the rule set. Each object contains:
  - `name`: A descriptive name for the step in the flow.
  - `operations`: An array of operations to be performed in this step. Each operation can be one of the following types:
    - `set`: Sets a value to a target variable.
    - `multiply`: Multiplies a target variable by a value.
    - `deduct`: Deducts a value from a target variable.
  - `cases`: An optional array of cases that define conditional operations. Each case has:
    - `when`: A condition that must be met for the case to be applied. This is an expression that can reference the inputs and outputs of the rule set.
    - `operations`: An array of operations to be performed if the condition is met.

## Variables

Variables are containers that hold values for calculations. They can be categorized into three types:
1. **Inputs**: These are variables where the user provides values when calculating the tax. They are defined in the `inputs` section of the rules file.
2. **Outputs**: These are variables that can be used to store intermediate or final results of the calculations. They are defined in the `outputs` section of the rules file.
3. **Special Variables**: These are variables that are used within the flow of the rules file but are not defined in the `inputs` or `outputs` sections. They are common variables that can be used in the calculations, such as `$liability`, which represents the current tax liability being calculated.

### Variable declaration
Variables declared in the `inputs` and `outputs` are using [JSON Schema](https://json-schema.org/) format. This means that properties such as `minimum`, `maximum`, `enum`, and `pattern` can be used to define the constraints and structure of the variables. For example,

```json
{
  "type": "number",
  "description": "The total income for the period",
  "minimum": 0,
  "maximum": 1000000
}
```

Special variables **cannot** be redeclared in the rules file and will be thrown an error if attempted. They are predefined variables that are used in the calculations and flow of the rules file.

### Referencing variables
For inputs and outputs, you can reference them directly by their name. For example, to reference the `gross_income` input variable, simply use `gross_income`.

For special variables, you can reference them by prefixing them with a dollar sign `$`. For example, to reference the current tax liability, use `$liability`.

### Special variables
Special variables are predefined variables that are used in the calculations and flow of the rules file. They are not declared in the `inputs` or `outputs` sections but are available for use throughout the rules file. Some common special variables include:
- `$liability`: Represents the current tax liability being calculated. This is the variable that holds the result of the tax calculation at any given point in the flow.

## Filing Schedules
Filing schedules define when tax filings are due. They define how frequent and when the tax filings should be made.

Each filing schedule has the following properties:
- `name`: The name of the filing schedule.
- `frequency`: The frequency of the filing
  - `quarterly`: Filing is due every quarter (every 3 months).
  - `annual`: Filing is due once a year.
- `when`: An optional condition that determines when the filing schedule should be applied. This is an expression that can reference the outputs of the rule set. If this condition is not met, the filing schedule will not be applied.
- `filing_day`: The day of the month when the filing is due. This is typically a number between 1 and 31, depending on the month. If the day exceeds the number of days in the month, it will be adjusted to the last day of the month.

### Example Filing Schedule
```json
{
  "name": "Quarterly Income Tax Filing",
  "frequency": "quarterly",
  "filing_day": 15,
  "when": {
    "diff($liability, gross_income)": {
      "gt": 0
    }
  }
}
```

## Conditional Rules

Conditional rules allows you to run specific operations or schedules based on certain conditions. This is useful for handling different scenarios in tax calculations, such as different tax rates for different income levels or requirement-specific cases.

At its core, a conditional rule is an `object` that contains the expression to be evaluated and the expected value to compare against, by explicitly telling the operator to use and the value to compare. For example:

```json
"cummulative_gross_income": {
  "lt": 250000
}
```

In this case `cummulative_gross_income` is the variable being evaluated, `lt` is the operator (less than), and `250000` is the value to compare against.

### Operators
Each rule must have an operator that defines how the condition is evaluated. The operator is a string that specifies the type of comparison to be made. They are case-sensitive and the value can be a number, string, or boolean depending on the context of the variable being evaluated.

The following operators can be used in conditional rules:
- `eq`: Equal to
- `ne`: Not equal to
- `gt`: Greater than
- `lt`: Less than
- `gte`: Greater than or equal to
- `lte`: Less than or equal to

## Expressions
> TODO

Expressions are used in conditional rules and operations to reference variables and perform calculations.

### Variable References
- Direct reference: `gross_income`
- Special variable: `$liability`
- Function calls: `diff($liability, gross_income)`

## Operations
> TODO

Operations define the actions that can be performed on variables during tax calculations

### Defining an Operation

> TODO

### Operation Types

> TODO

## Operation Best Practices

> TODO
