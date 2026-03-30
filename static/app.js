const root = document.getElementById("app");

const DEFAULT_READING_FORM = {
  date: new Date().toISOString().slice(0, 10),
  minutes: "",
  pagesRead: "",
  bookId: "",
};

const state = {
  kids: [],
  selectedKidId: "",
  kid: null,
  dashboard: null,
  mode: "reading",
  readingForm: { ...DEFAULT_READING_FORM },
  questions: [],
  error: "",
  successMessage: "",
  isLoadingKid: true,
  isSavingReading: false,
  isGeneratingMath: false,
  isSavingMath: false,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatTopic(topic) {
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

async function readJson(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.detail || payload.error || "Something went wrong.");
  }

  return payload;
}

function getMathProgress() {
  if (!state.questions.length) {
    return { resolved: 0, score: 0, readyToSave: false, totalAttempts: 0 };
  }

  const resolved = state.questions.filter((question) => question.locked).length;
  const score = state.questions.filter((question) => question.correct).length;
  const totalAttempts = state.questions.reduce((sum, question) => sum + question.attempts, 0);

  return {
    resolved,
    score,
    totalAttempts,
    readyToSave: resolved === state.questions.length,
  };
}

async function loadKidOverview() {
  state.error = "";
  render();

  try {
    const payload = await readJson(await fetch("/api/kids"));
    state.kids = payload.kids;

    if (payload.kids.length && !state.selectedKidId) {
      state.selectedKidId = payload.kids[0].id;
      await loadKidProfile(state.selectedKidId);
      return;
    }
  } catch (error) {
    state.error = error.message;
    state.isLoadingKid = false;
  }

  render();
}

async function loadKidProfile(kidId) {
  state.isLoadingKid = true;
  state.error = "";
  render();

  try {
    const [kidPayload, dashboardPayload] = await Promise.all([
      readJson(await fetch(`/api/kids/${kidId}`)),
      readJson(await fetch(`/api/kids/${kidId}/dashboard`)),
    ]);

    state.kid = kidPayload.kid;
    state.dashboard = dashboardPayload.stats;
    state.questions = [];
    state.readingForm = {
      ...DEFAULT_READING_FORM,
      date: new Date().toISOString().slice(0, 10),
      bookId: kidPayload.kid.currentBooks?.[0]?.id || "",
    };
  } catch (error) {
    state.error = error.message;
  } finally {
    state.isLoadingKid = false;
    render();
  }
}

async function refreshSelectedKid() {
  if (!state.selectedKidId) {
    return;
  }

  await loadKidProfile(state.selectedKidId);
}

async function handleReadingSubmit(event) {
  event.preventDefault();
  state.isSavingReading = true;
  state.error = "";
  state.successMessage = "";
  render();

  try {
    await readJson(
      await fetch(`/api/kids/${state.selectedKidId}/reading-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.readingForm),
      })
    );

    state.successMessage = "Reading session saved.";
    state.readingForm = {
      ...DEFAULT_READING_FORM,
      bookId: state.readingForm.bookId,
    };
    await refreshSelectedKid();
  } catch (error) {
    state.error = error.message;
  } finally {
    state.isSavingReading = false;
    render();
  }
}

async function startMathGame() {
  state.isGeneratingMath = true;
  state.error = "";
  state.successMessage = "";
  render();

  try {
    const payload = await readJson(await fetch(`/api/kids/${state.selectedKidId}/math-questions`));
    state.questions = payload.questions.map((question) => ({
      ...question,
      userAnswer: "",
      attempts: 0,
      locked: false,
      correct: false,
      feedback: "",
    }));
  } catch (error) {
    state.error = error.message;
  } finally {
    state.isGeneratingMath = false;
    render();
  }
}

function updateQuestion(index, updates, shouldRender = true) {
  state.questions = state.questions.map((question, questionIndex) =>
    questionIndex === index ? { ...question, ...updates } : question
  );

  if (shouldRender) {
    render();
  }
}

function checkQuestion(index) {
  const question = state.questions[index];

  if (!question || question.locked || question.userAnswer === "") {
    return;
  }

  const isCorrect = Number(question.userAnswer) === question.answer;
  const nextAttempts = question.attempts + 1;

  if (isCorrect) {
    updateQuestion(index, {
      attempts: nextAttempts,
      correct: true,
      locked: true,
      feedback: "Correct!",
    });
    return;
  }

  if (nextAttempts >= 2) {
    updateQuestion(index, {
      attempts: nextAttempts,
      correct: false,
      locked: true,
      feedback: `Answer: ${question.answer}`,
    });
    return;
  }

  updateQuestion(index, {
    attempts: nextAttempts,
    correct: false,
    feedback: "Try one more time.",
  });
}

async function saveMathGame() {
  state.isSavingMath = true;
  state.error = "";
  state.successMessage = "";
  render();

  try {
    await readJson(
      await fetch(`/api/kids/${state.selectedKidId}/math-games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playedAt: new Date().toISOString(),
          questions: state.questions.map((question) => ({
            prompt: question.prompt,
            topic: question.topic,
            answer: question.answer,
            userAnswer: question.userAnswer,
            attempts: question.attempts,
          })),
        }),
      })
    );

    state.questions = [];
    state.successMessage = "Math game saved.";
    await refreshSelectedKid();
  } catch (error) {
    state.error = error.message;
  } finally {
    state.isSavingMath = false;
    render();
  }
}

function renderMessages() {
  return `
    ${state.error ? `<p class="message error">${escapeHtml(state.error)}</p>` : ""}
    ${state.successMessage ? `<p class="message success">${escapeHtml(state.successMessage)}</p>` : ""}
  `;
}

function renderKidButtons() {
  return state.kids
    .map(
      (kid) => `
        <button
          type="button"
          class="kid-button ${kid.id === state.selectedKidId ? "active" : ""}"
          data-kid-id="${kid.id}"
        >
          <div class="kid-topline">
            <span class="avatar-dot" style="background-color: ${escapeHtml(kid.avatarColor)}" aria-hidden="true"></span>
            <strong>${escapeHtml(kid.name)}</strong>
          </div>
          <span class="muted">Age ${escapeHtml(kid.age)}</span>
          <span class="tiny">${escapeHtml(kid.currentBookCount)} current books</span>
        </button>
      `
    )
    .join("");
}

function renderCurrentBooks() {
  return state.kid.currentBooks
    .map((book) => {
      const progress = Math.round((book.currentPage / book.totalPages) * 100);
      return `
        <article key="${book.id}" class="book-card">
          <div>
            <h4 class="card-title">${escapeHtml(book.title)}</h4>
            <p class="muted">${escapeHtml(book.author)} · ${escapeHtml(book.level)}</p>
          </div>
          <div>
            <div class="progress-track" aria-hidden="true">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <p class="tiny">Page ${escapeHtml(book.currentPage)} of ${escapeHtml(book.totalPages)}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderReadingSessions() {
  return state.kid.readingSessions
    .map(
      (session) => `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(session.bookTitle)}</strong>
            <p class="muted tiny">${escapeHtml(formatDate(session.date))}</p>
          </div>
          <div class="tiny">${escapeHtml(session.minutes)} min · ${escapeHtml(session.pagesRead)} pages</div>
        </div>
      `
    )
    .join("");
}

function renderReadingSection() {
  return `
    <section class="section split">
      <div class="panel grid">
        <div>
          <h3 class="panel-title">Current books</h3>
          <p class="section-copy">Books live in their own collection, while kid-specific progress stays embedded with the child.</p>
        </div>

        <div class="book-grid">${renderCurrentBooks()}</div>

        <div>
          <h3 class="panel-title">Recent reading</h3>
          <div class="session-list">${renderReadingSessions()}</div>
        </div>
      </div>

      <form class="panel form-grid" id="reading-form">
        <div>
          <h3 class="panel-title">Log a reading session</h3>
          <p class="section-copy">Add the date, minutes, and pages read. The matching book progress updates too.</p>
        </div>

        <div class="field">
          <label for="bookId">Book</label>
          <select id="bookId" name="bookId">
            ${state.kid.currentBooks
              .map(
                (book) => `
                  <option value="${book.id}" ${book.id === state.readingForm.bookId ? "selected" : ""}>
                    ${escapeHtml(book.title)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>

        <div class="field">
          <label for="readingDate">Date</label>
          <input id="readingDate" name="date" type="date" value="${escapeHtml(state.readingForm.date)}">
        </div>

        <div class="field">
          <label for="minutes">Minutes</label>
          <input id="minutes" name="minutes" type="number" min="1" value="${escapeHtml(state.readingForm.minutes)}">
        </div>

        <div class="field">
          <label for="pagesRead">Pages read</label>
          <input id="pagesRead" name="pagesRead" type="number" min="0" value="${escapeHtml(state.readingForm.pagesRead)}">
        </div>

        <div class="button-row">
          <button class="button primary" type="submit" ${state.isSavingReading ? "disabled" : ""}>
            ${state.isSavingReading ? "Saving..." : "Save reading session"}
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderMathQuestions() {
  return state.questions
    .map(
      (question, index) => `
        <article class="question-card">
          <div class="question-header">
            <div>
              <span class="topic-pill">${escapeHtml(formatTopic(question.topic))}</span>
              <h4 class="card-title">${escapeHtml(question.prompt)}</h4>
            </div>
            <span class="tiny">Attempts: ${escapeHtml(question.attempts)}</span>
          </div>

          <div class="question-actions">
            <input
              type="number"
              min="-100"
              value="${escapeHtml(question.userAnswer)}"
              data-question-input="${index}"
              ${question.locked ? "disabled" : ""}
            >
            <button
              class="button secondary"
              type="button"
              data-check-question="${index}"
              ${question.locked || question.userAnswer === "" ? "disabled" : ""}
            >
              ${question.locked ? "Done" : "Check"}
            </button>
          </div>

          <p class="feedback ${question.locked && question.correct ? "success" : question.locked && !question.correct ? "error" : ""}">
            ${escapeHtml(question.feedback)}
          </p>
        </article>
      `
    )
    .join("");
}

function renderMathSection() {
  const mathProgress = getMathProgress();
  return `
    <section class="section split">
      <div class="panel grid">
        <div>
          <h3 class="panel-title">Math mode</h3>
          <p class="section-copy">Generate 10 simple questions, check answers, and save the game result with score and attempts.</p>
        </div>

        <div class="button-row">
          <button class="button primary" type="button" id="generate-math" ${state.isGeneratingMath ? "disabled" : ""}>
            ${state.isGeneratingMath ? "Building questions..." : "Generate 10 questions"}
          </button>
          ${
            state.questions.length
              ? `<button class="button secondary" type="button" id="clear-math" ${state.isSavingMath ? "disabled" : ""}>Clear game</button>`
              : ""
          }
        </div>

        ${
          state.questions.length
            ? `
              <div class="stats-grid">
                <div class="stat-card">
                  <p class="stat-label">Checked</p>
                  <p class="stat-value">${mathProgress.resolved}/${state.questions.length}</p>
                </div>
                <div class="stat-card">
                  <p class="stat-label">Current score</p>
                  <p class="stat-value">${mathProgress.score}</p>
                </div>
                <div class="stat-card">
                  <p class="stat-label">Attempts</p>
                  <p class="stat-value">${mathProgress.totalAttempts}</p>
                </div>
              </div>

              <div class="question-grid">${renderMathQuestions()}</div>

              <div class="button-row">
                <button
                  class="button primary"
                  type="button"
                  id="save-math"
                  ${!mathProgress.readyToSave || state.isSavingMath ? "disabled" : ""}
                >
                  ${state.isSavingMath ? "Saving..." : "Save math game"}
                </button>
              </div>
            `
            : `<div class="empty-state">No active math game yet. Generate a question set to begin.</div>`
        }
      </div>

      <div class="panel grid">
        <div>
          <h3 class="panel-title">Recent math results</h3>
          <p class="section-copy">Each saved game stays embedded under the kid record with its 10 question results.</p>
        </div>

        ${
          state.kid.mathGames.length
            ? `
              <div class="session-list">
                ${state.kid.mathGames
                  .map(
                    (game) => `
                      <div class="list-item">
                        <div>
                          <strong>${escapeHtml(formatDate(game.playedAt))}</strong>
                          <p class="muted tiny">Saved game result</p>
                        </div>
                        <div class="tiny">${escapeHtml(game.score)}/10 · ${escapeHtml(game.attempts)} attempts</div>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
            : `<div class="empty-state">No saved math games yet.</div>`
        }
      </div>
    </section>
  `;
}

function renderDashboard() {
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Parent dashboard</h2>
          <p class="section-copy">Recent activity plus rollups powered by MongoDB documents and an aggregation pipeline.</p>
        </div>
      </div>

      <div class="split">
        <div class="panel">
          <h3 class="panel-title">Recent activity</h3>
          <div class="activity-list">
            ${state.dashboard.recentActivity
              .map(
                (activity) => `
                  <div class="list-item">
                    <div>
                      <strong>${escapeHtml(activity.label)}</strong>
                      <p class="muted tiny">${escapeHtml(formatDate(activity.date))}</p>
                    </div>
                    <span class="topic-pill">${escapeHtml(activity.type)}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>

        <div class="panel grid">
          <div>
            <h3 class="panel-title">Math accuracy by topic</h3>
            <p class="section-copy">This section is computed with a MongoDB aggregation over embedded math question documents.</p>
          </div>

          ${
            state.dashboard.mathAccuracyByTopic.length
              ? `
                <div class="accuracy-list">
                  ${state.dashboard.mathAccuracyByTopic
                    .map(
                      (topic) => `
                        <div class="list-item">
                          <div>
                            <strong>${escapeHtml(formatTopic(topic.topic))}</strong>
                            <p class="muted tiny">${escapeHtml(topic.correctAnswers)} correct of ${escapeHtml(topic.totalQuestions)}</p>
                          </div>
                          <div>${escapeHtml(topic.accuracy)}%</div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
              : `<div class="empty-state">No math accuracy yet. Save a game to populate this section.</div>`
          }
        </div>
      </div>
    </section>
  `;
}

function render() {
  root.innerHTML = `
    <section class="hero">
      <div class="hero-card">
        <span class="eyebrow">Kid Quest Python</span>
        <h1>Reading wins. Math reps. Parent-ready stats.</h1>
        <p>A small FastAPI app for reading and math tracking backed by MongoDB.</p>
        <div class="status-strip">
          <span class="chip">FastAPI</span>
          <span class="chip">PyMongo</span>
          <span class="chip">Seeded with 2 kids</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Choose a child profile</h2>
          <p class="section-copy">Pick a kid to switch the Reading mode, Math mode, and dashboard.</p>
        </div>
      </div>
      <div class="kid-grid">${renderKidButtons()}</div>
    </section>

    ${renderMessages()}

    ${
      state.isLoadingKid
        ? `<div class="section empty-state">Loading kid profile...</div>`
        : state.kid && state.dashboard
          ? `
            <section class="section">
              <div class="section-header">
                <div>
                  <h2 class="section-title">${escapeHtml(state.kid.name)}'s snapshot</h2>
                  <p class="section-copy">Quick Python-powered stats pulled from MongoDB data.</p>
                </div>
                <div class="tabs">
                  <button type="button" class="tab-button ${state.mode === "reading" ? "active" : ""}" data-mode="reading">Reading</button>
                  <button type="button" class="tab-button ${state.mode === "math" ? "active" : ""}" data-mode="math">Math</button>
                </div>
              </div>

              <div class="stats-grid">
                <div class="stat-card">
                  <p class="stat-label">Total reading minutes</p>
                  <p class="stat-value">${escapeHtml(state.dashboard.totalReadingMinutes)}</p>
                </div>
                <div class="stat-card">
                  <p class="stat-label">Reading streak</p>
                  <p class="stat-value">${escapeHtml(state.dashboard.readingStreak)} days</p>
                </div>
                <div class="stat-card">
                  <p class="stat-label">Math games saved</p>
                  <p class="stat-value">${escapeHtml(state.kid.mathGameCount)}</p>
                </div>
              </div>
            </section>

            ${state.mode === "reading" ? renderReadingSection() : renderMathSection()}
            ${renderDashboard()}
          `
          : ""
    }
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-kid-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedKidId = button.dataset.kidId;
      state.mode = "reading";
      state.successMessage = "";
      render();
      await loadKidProfile(state.selectedKidId);
    });
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      render();
    });
  });

  const readingForm = document.getElementById("reading-form");
  if (readingForm) {
    readingForm.addEventListener("submit", handleReadingSubmit);
    ["bookId", "date", "minutes", "pagesRead"].forEach((fieldName) => {
      const field = readingForm.elements.namedItem(fieldName);
      if (field) {
        field.addEventListener("input", (event) => {
          state.readingForm[fieldName] = event.target.value;
        });
        field.addEventListener("change", (event) => {
          state.readingForm[fieldName] = event.target.value;
        });
      }
    });
  }

  const generateMathButton = document.getElementById("generate-math");
  if (generateMathButton) {
    generateMathButton.addEventListener("click", startMathGame);
  }

  const clearMathButton = document.getElementById("clear-math");
  if (clearMathButton) {
    clearMathButton.addEventListener("click", () => {
      state.questions = [];
      render();
    });
  }

  document.querySelectorAll("[data-question-input]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.questionInput);
      updateQuestion(
        index,
        {
          userAnswer: event.target.value,
          feedback: "",
        },
        false
      );

      const button = document.querySelector(`[data-check-question="${index}"]`);
      if (button) {
        button.disabled = event.target.value === "";
      }
    });
  });

  document.querySelectorAll("[data-check-question]").forEach((button) => {
    button.addEventListener("click", () => {
      checkQuestion(Number(button.dataset.checkQuestion));
    });
  });

  const saveMathButton = document.getElementById("save-math");
  if (saveMathButton) {
    saveMathButton.addEventListener("click", saveMathGame);
  }
}

render();
loadKidOverview();
