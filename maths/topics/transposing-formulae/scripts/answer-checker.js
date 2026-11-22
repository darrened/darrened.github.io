
"use strict";

// ==========================================
// ANSWER NORMALISATION
// ==========================================

export function normaliseEquation(input) {
  let value = input;

  // Standardise minus signs.
  value = value.replace(/[−–—]/g, "-");

  // Standardise multiplication symbols.
  value = value.replace(/[×·]/g, "*");

  // Standardise pi.
  value = value.replace(/π/g, "pi");

  // Standardise implicit multiplication between variables.
    // For example, pV becomes p*V and nRT becomes n*R*T.
    // Do not split the mathematical constant pi.
    value = value.replace(
    /(?!pi)([a-z])(?=[a-z])/gi,
    "$1*"
    );

  // Remove spaces.
  value = value.replace(/\s+/g, "");

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
    /([a-zA-Z])\*(\d+)(?![a-zA-Z0-9])/g,
    "$2*$1"
    );

  // Remove optional multiplication symbols.
  value = value.replace(
    /(\d)\*(?=[a-zA-Z(])/g,
    "$1"
  );

// Remove brackets around a numerator before division.
// Example: (2*t)/3 -> 2*t/3
value = value.replace(
  /\(([^()]+)\)\/(\d+)/g,
  "$1/$2"
);

// Normalise negative expressions inside brackets.
value = normaliseNegativeBrackets(value);

  const canonicalSides = value
  .split("=")
  .map(side => normaliseFractions(side))
  .map(canonicalExpression);

    // Equation sides can be reversed.
    canonicalSides.sort();

    return canonicalSides.join("=");
}



// ==========================================
// FRACTION NORMALISATION
// ==========================================

function normaliseFractions(expression) {

  // Division by a fraction:
  // (F-32)/(9/5) -> (F-32)*5/9
  expression = expression.replace(
    /\(([^()]+)\)\/\((\d+)\/(\d+)\)/g,
    "($1)*$3/$2"
  );

  // Division of a fraction by a variable:
  // (S/pi)/r -> S/(pi*r)
  expression = expression.replace(
    /\(([a-z]\w*)\/([a-z]\w*)\)\/([a-z]\w*)/gi,
    "$1/($2*$3)"
  );

  // Division by a fraction:
  // H/(R/r) -> H*r/R
  expression = expression.replace(
    /([a-z]\w*)\/\(([a-z]\w*)\/([a-z]\w*)\)/gi,
    "$1*$3/$2"
  );

  return expression;
}


function normaliseNegativeBrackets(expression) {

  // Convert +(-expression) into -expression.
  expression = expression.replace(
    /\+\((-[^()]+)\)/g,
    "$1"
  );

  return expression;
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
    sign = sign === "-" ? "-" : "";

    // Reorder simple variable multiplication.
    // For example, R*r becomes r*R.
    // Leave fractions and more complex expressions untouched.
    if (/^[a-z]\d*(\*[a-z]\d*)+$/i.test(term)) {

    term = term
        .split("*")
        .sort((a, b) => a.localeCompare(b))
        .join("*");
    }

    return {
    sign,
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

    // (t) -> t when used as a multiplication factor
    expression = expression.replace(
      /\*\(([a-z]\d*)\)/g,
      "*$1"
    );

    // (4/t)*t -> 4/t*t
    expression = expression.replace(
      /\(([^()]*)\)\*/g,
      "$1*"
    );

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
