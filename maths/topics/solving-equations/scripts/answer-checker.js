
"use strict";

// ==========================================
// NORMALISE FRACTION MULTIPLICATION
// ==========================================

function normaliseFractionMultiplication(expression) {

  // Convert (20/35)y into 20y/35.
  expression = expression.replace(
    /\((\d+)\/(\d+)\)([a-z]\w*)/gi,
    "$1$3/$2"
  );

  // Convert 20/35*y into 20y/35.
  expression = expression.replace(
    /(\d+)\/(\d+)\*([a-z]\w*)/gi,
    "$1$3/$2"
  );

  // Convert (2/3)*t into 2t/3.
  expression = expression.replace(
    /\((\d+)\/(\d+)\)\*([a-z]\w*)/gi,
    "$1$3/$2"
  );

  return expression;
}

// ==========================================
// EXPAND BRACKETED MULTIPLICATION
// ==========================================

function expandBracketedIntegerMultiplication(expression) {

  return expression.replace(
    /\(([^()]*)\)\*(\d+)/g,
    (match, contents, multiplier) => {

      const terms = [];

      let current = "";

      for (let i = 0; i < contents.length; i++) {

        const char = contents[i];
        const previous = contents[i - 1];

        const isOperator =
          char === "+" || char === "-";

        const isUnarySign =
          i === 0 ||
          ["+", "-", "*", "/"].includes(previous);

        if (
          isOperator &&
          current !== "" &&
          !isUnarySign
        ) {

          terms.push(current);
          current = char;

        } else {

          current += char;
        }
      }

      if (current) {
        terms.push(current);
      }

      // Only expand brackets containing multiple terms.
      if (terms.length < 2) {
        return match;
      }

      return terms
        .map(term => `${term}*${multiplier}`)
        .join("");
    }
  );
}


function normaliseImplicitMultiplication(expression) {

  // Convert 12x into 12*x.
  expression = expression.replace(
    /(\d)([a-z])/gi,
    "$1*$2"
  );

  // Convert 3(x+1) into 3*(x+1).
  // Also handles variables and closing brackets before brackets.
  expression = expression.replace(
    /([a-z0-9)])\(/gi,
    "$1*("
  );

  return expression;
}



// ==========================================
// ANSWER NORMALISATION
// ==========================================

export function normaliseEquation(input) {

  let value = input.toLowerCase();

  // Standardise minus signs.
  value = value.replace(/[−–—]/g, "-");

  // Standardise multiplication symbols.
  value = value.replace(/[×·]/g, "*");

  // Remove spaces.
  value = value.replace(/\s+/g, "");

  // Standardise implicit multiplication.
  value = normaliseImplicitMultiplication(value);
  // Normalise multiplication of fractions by variables.
  value = normaliseFractionMultiplication(value);
  // Expand multiplication of bracketed expressions.
  value = expandBracketedIntegerMultiplication(value);

  const sides = value.split("=");

  if (
    sides.length !== 2 ||
    !sides[0] ||
    !sides[1]
  ) {
    return null;
  }

  // Check bracket balance.
  for (const side of sides) {

    let depth = 0;

    for (const char of side) {

      if (char === "(") depth++;
      if (char === ")") depth--;

      if (depth < 0) return null;
    }

    if (depth !== 0) return null;
  }

  // Standardise multiplication order.
    // For example, x*4 becomes 4*x.
    // This allows coefficients before or after variables.

    value = value.replace(
    /([a-z])\*(\d+)(?![a-z0-9])/g,
    "$2*$1"
    );

  // Remove optional multiplication symbols.
  value = value.replace(
    /(\d)\*(?=[a-z])/g,
    "$1"
  );

//   value = value.replace(
//     /([a-z)])\*(?=[a-z0-9(])/g,
//     "$1"
//   );

// Remove brackets around a numerator before division.
// Example: (2*t)/3 -> 2*t/3
value = value.replace(
  /\(([^()]+)\)\/(\d+)/g,
  "$1/$2"
);

  return value
    .split("=")
    .map(canonicalExpression)
    .join("=");
}


// ==========================================
// CANONICAL EXPRESSION
// ==========================================


export function canonicalExpression(expression) {

  // Remove brackets surrounding the entire expression.
  expression = removeOuterBrackets(expression);
  expression = removeRedundantMultiplicationBrackets(expression);

  const terms = [];

  let depth = 0;
  let current = "";

  for (let i = 0; i < expression.length; i++) {

    const char = expression[i];
    const previous = expression[i - 1];

    if (char === "(") depth++;
    if (char === ")") depth--;

    const isOperator =
      char === "+" || char === "-";

    const isUnarySign =
      i === 0 ||
      ["+", "-", "*", "/", "("].includes(previous);

    if (
      depth === 0 &&
      isOperator &&
      current !== "" &&
      !isUnarySign
    ) {

      terms.push(current);
      current = char;

    } else {

      current += char;
    }
  }

  if (current) {
    terms.push(current);
  }

  
  // Separate each term's sign from its contents.
  const normalisedTerms = terms.map(term => {

    let sign = "";

    if (term.startsWith("-")) {
      sign = "-";
      term = term.slice(1);
    }

    else if (term.startsWith("+")) {
      sign = "+";
      term = term.slice(1);
    }

    // A positive sign is optional.
    return {
      sign: sign === "-" ? "-" : "",
      term
    };
  });

  // Sort terms while keeping negative signs attached.
  normalisedTerms.sort((a, b) =>
    (a.sign + a.term).localeCompare(b.sign + b.term)
  );

  return normalisedTerms
    .map(item => item.sign + item.term)
    .join("|");
}


function removeRedundantMultiplicationBrackets(expression) {

  let previous;

  do {
    previous = expression;

    for (let i = 0; i < expression.length; i++) {

      if (expression[i] !== "(") continue;

      // Find the matching closing bracket.
      let depth = 1;
      let j = i + 1;

      for (; j < expression.length; j++) {

        if (expression[j] === "(") depth++;
        if (expression[j] === ")") depth--;

        if (depth === 0) break;
      }

      if (depth !== 0) continue;

      const contents = expression.slice(i + 1, j);

      // Only consider brackets used as multiplication factors.
      const before = expression[i - 1];
      const after = expression[j + 1];

      if (before !== "*" && after !== "*") continue;

      // Check for top-level addition or subtraction.
      let innerDepth = 0;
      let hasAdditionOrSubtraction = false;

      for (let k = 0; k < contents.length; k++) {

        const char = contents[k];
        const previousChar = contents[k - 1];

        if (char === "(") innerDepth++;
        if (char === ")") innerDepth--;

        const isOperator =
          char === "+" || char === "-";

        const isUnarySign =
          k === 0 ||
          ["+", "-", "*", "/", "("].includes(previousChar);

        if (
          innerDepth === 0 &&
          isOperator &&
          !isUnarySign
        ) {
          hasAdditionOrSubtraction = true;
          break;
        }
      }

      // Brackets around addition or subtraction must remain.
      // However, the multiplication symbol immediately before
      // those brackets is optional.
      if (hasAdditionOrSubtraction) {

        if (before === "*") {

          expression =
            expression.slice(0, i - 1) +
            expression.slice(i);

          break;
        }

        continue;
      }

      // Remove the redundant brackets.
      expression =
        expression.slice(0, i) +
        contents +
        expression.slice(j + 1);

      break;
    }

  } while (expression !== previous);

  return expression;
}



// ==========================================
// REMOVE UNNECESSARY OUTER BRACKETS
// ==========================================

export function removeOuterBrackets(value) {

  while (
    value.startsWith("(") &&
    value.endsWith(")")
  ) {

    let depth = 0;
    let surroundsEverything = true;

    for (let i = 0; i < value.length - 1; i++) {

      if (value[i] === "(") depth++;
      if (value[i] === ")") depth--;

      if (depth === 0) {
        surroundsEverything = false;
        break;
      }
    }

    if (!surroundsEverything) break;

    value = value.slice(1, -1);
  }

  return value;
}


// ==========================================
// ANSWER COMPARISON
// ==========================================

export function answersMatch(student, expected) {

  const studentNormalised =
    normaliseEquation(student);

  const expectedNormalised =
    normaliseEquation(expected);

  return (
    studentNormalised !== null &&
    expectedNormalised !== null &&
    studentNormalised === expectedNormalised
  );
}
