"use strict";
import { answersMatch } from "./answer-checker.js";

// ==========================================
// APPLICATION STATE
// ==========================================

let lessons = {};

let currentQuestion = "16";
let currentStep = 0;
let completedSteps = [];

const $ = id => document.getElementById(id);


// ==========================================
// LOAD LESSON DATA
// ==========================================

async function loadLessons() {

  try {

    const response = await fetch("scripts/lessons/lessons.json");

    if (!response.ok) {
      throw new Error("Could not find lessons.json");
    }

    lessons = await response.json();

    populateQuestionSelector();

    render();

    buildTimesTable();

  } catch (error) {

    console.error(error);

    document.querySelector("main").innerHTML = `
      <section class="panel">
        <h2>Unable to load the lessons</h2>
        <p>
          The application could not find or read
          lessons.json.
        </p>
        <p>
          Please check that index.html, app.js and
          lessons.json are in the same folder.
        </p>
        <p>
          If you opened index.html directly, try running
          the application through a local web server.
        </p>
        <p><strong>Technical detail:</strong>
          ${escapeHTML(error.message)}
        </p>
      </section>
    `;
  }
}


// Prevent error messages from interpreting HTML.
function escapeHTML(value) {

  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}


// ==========================================
// QUESTION SELECTOR
// ==========================================

function populateQuestionSelector() {

  const selector = $("questionSelect");

  selector.innerHTML = "";

  Object.keys(lessons).forEach(id => {

    const option = document.createElement("option");

    option.value = id;
    option.textContent = lessons[id].title;

    selector.appendChild(option);
  });

  currentQuestion = Object.keys(lessons)[0];

  selector.value = currentQuestion;

  selector.addEventListener("change", () => {

    currentQuestion = selector.value;

    restartQuestion();
  });
}


function getLesson() {
  return lessons[currentQuestion];
}


// ==========================================
// MATHEMATICAL DISPLAY
// ==========================================

function showMath(markup) {

  return `
    <math xmlns="http://www.w3.org/1998/Math/MathML"
          display="block">
      ${markup}
    </math>
  `;
}


// ==========================================
// DISPLAY THE LESSON
// ==========================================

function render() {

  const lesson = getLesson();

  if (!lesson) return;

  const total = lesson.steps.length;

  const finished = currentStep >= total;

  // Original equation.
  $("original").innerHTML =
    showMath(lesson.original);

  // Additional information.
  $("given").textContent =
    lesson.given || "";

  // Progress.
  $("progressText").textContent =
    `Completed ${completedSteps.length} of ${total} steps`;

  $("progressFill").style.width =
    `${completedSteps.length / total * 100}%`;

  // Completed steps.
  $("completed").innerHTML = "";

  if (completedSteps.length === 0) {

    $("completed").textContent =
      "Your completed steps will appear here.";
  }

  completedSteps.forEach((step, index) => {

    const item = document.createElement("div");

    item.className = "completed-step";

    const heading = document.createElement("strong");

    heading.textContent = `✓ Step ${index + 1}`;

    const equation = document.createElement("div");

    equation.className = "equation";

    equation.innerHTML =
      showMath(step.mathml);

    item.append(heading, equation);

    $("completed").appendChild(item);
  });

  // Clear old feedback.
  $("feedback").className = "feedback";

  $("feedback").textContent = "";

  // Completion state.
  $("success").hidden = !finished;

  $("answer").disabled = finished;

  $("submitButton").disabled = finished;

  if (finished) {

    const finalStep = lesson.steps[total - 1];

    $("currentEquation").innerHTML =
      showMath(finalStep.mathml);

    $("minorHint").textContent =
      "You've completed the entire solution.";

    $("majorHint").textContent =
      "Well done! Review your completed steps above.";

  } else {

    const step = lesson.steps[currentStep];

    // First step displays the original equation.
    // Subsequent steps display the previous completed equation.

    const currentMath = currentStep === 0
      ? lesson.original
      : completedSteps[completedSteps.length - 1].mathml;

    $("currentEquation").innerHTML =
      showMath(currentMath);

    $("minorHint").textContent =
      step.prompt;

    $("majorHint").textContent =
      step.hint;
  }

  // Clear the input for the next attempt.
  $("answer").value = "";
}


// ==========================================
// FEEDBACK
// ==========================================

function showFeedback(message, correct) {

  const feedback = $("feedback");

  feedback.textContent = message;

  feedback.className = correct
    ? "feedback good"
    : "feedback bad";
}


// ==========================================
// CHECK STUDENT ANSWER
// ==========================================

function checkAnswer() {

  const lesson = getLesson();

  if (currentStep >= lesson.steps.length) {
    return;
  }

  const studentAnswer =
    $("answer").value.trim();

  if (!studentAnswer) {

    showFeedback(
      "Please enter an equation first.",
      false
    );

    return;
  }

  const expected =
    lesson.steps[currentStep].expected;

  if (answersMatch(studentAnswer, expected)) {

    // Record the completed step.
    completedSteps.push(lesson.steps[currentStep]);

    // Unlock the next step.
    currentStep++;

    // Update the screen.
    render();

    if (currentStep === lesson.steps.length) {

      showFeedback(
        "Correct! You've completed the question.",
        true
      );

    } else {

      showFeedback(
        "Correct! You've successfully completed this step.",
        true
      );
    }

  } else {

    showFeedback(
      "Not quite. Check your signs, brackets and the operation you've performed. Have another try!",
      false
    );
  }
}


// ==========================================
// RESTART QUESTION
// ==========================================

function restartQuestion() {

  currentStep = 0;

  completedSteps = [];

  render();
}


// ==========================================
// INPUT CONTROLS
// ==========================================

$("submitButton").addEventListener(
  "click",
  checkAnswer
);

$("clearButton").addEventListener("click", () => {

  $("answer").value = "";

  $("feedback").className = "feedback";

  $("answer").focus();
});


$("restartButton").addEventListener(
  "click",
  restartQuestion
);


$("answer").addEventListener("keydown", event => {

  if (event.key === "Enter") {
    checkAnswer();
  }
});


// ==========================================
// POP-UP PANELS
// ==========================================

function openModal(id) {

  $(id).classList.add("open");
}

function closeModal(id) {

  $(id).classList.remove("open");
}


// Open reference panels.
$("timesButton").addEventListener("click", () => {

  openModal("timesModal");
});

$("syntaxButton").addEventListener("click", () => {

  openModal("syntaxModal");
});


// Close buttons.
document.querySelectorAll("[data-close]").forEach(button => {

  button.addEventListener("click", () => {

    closeModal(button.dataset.close);
  });
});


// Click outside a panel to close it.
document.querySelectorAll(".modal").forEach(modal => {

  modal.addEventListener("click", event => {

    if (event.target === modal) {

      modal.classList.remove("open");
    }
  });
});


// Escape key closes open panels.
document.addEventListener("keydown", event => {

  if (event.key === "Escape") {

    document.querySelectorAll(".modal.open").forEach(modal => {

      modal.classList.remove("open");
    });
  }
});


// ==========================================
// TIMES TABLE GENERATOR
// ==========================================

function buildTimesTable() {

  const table = $("timesTable");

  table.innerHTML = "";

  const numbers = [];

  for (let i = 1; i <= 12; i++) {
    numbers.push(i);
  }

  const selected = $("multiplesInput").value
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .map(Number);

  const validSelection =
    selected.length > 0 &&
    selected.every(number =>
      Number.isInteger(number) &&
      number >= 1 &&
      number <= 144
    );

  // Table header.
  const header = document.createElement("tr");

  const corner = document.createElement("th");

  corner.textContent = "×";

  header.appendChild(corner);

  numbers.forEach(number => {

    const th = document.createElement("th");

    th.textContent = number;

    header.appendChild(th);
  });

  table.appendChild(header);


  // Table rows.
  numbers.forEach(row => {

    const tr = document.createElement("tr");

    const heading = document.createElement("th");

    heading.textContent = row;

    tr.appendChild(heading);

    numbers.forEach(column => {

      const td = document.createElement("td");

      const product = row * column;

      td.textContent = product;

      // Highlight common multiples.
      if (
        validSelection &&
        selected.every(number =>
          product % number === 0
        )
      ) {

        td.classList.add("highlight");
      }

      tr.appendChild(td);
    });

    table.appendChild(tr);
  });
}


// Update the highlighting as the student types.
$("multiplesInput").addEventListener(
  "input",
  buildTimesTable
);


// ==========================================
// START THE APPLICATION
// ==========================================

loadLessons();
