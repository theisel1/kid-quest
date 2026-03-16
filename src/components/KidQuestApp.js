"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

const DEFAULT_READING_FORM = {
  date: new Date().toISOString().slice(0, 10),
  minutes: "",
  pagesRead: "",
  bookTitle: "",
};

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
    throw new Error(payload.error || "Something went wrong.");
  }

  return payload;
}

export default function KidQuestApp() {
  const [kids, setKids] = useState([]);
  const [selectedKidId, setSelectedKidId] = useState("");
  const [kid, setKid] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [mode, setMode] = useState("reading");
  const [readingForm, setReadingForm] = useState(DEFAULT_READING_FORM);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLoadingKid, setIsLoadingKid] = useState(true);
  const [isSavingReading, setIsSavingReading] = useState(false);
  const [isGeneratingMath, setIsGeneratingMath] = useState(false);
  const [isSavingMath, setIsSavingMath] = useState(false);

  async function loadKidOverview() {
    setError("");
    const payload = await readJson(await fetch("/api/kids"));
    setKids(payload.kids);

    if (payload.kids.length && !selectedKidId) {
      setSelectedKidId(payload.kids[0].id);
    }
  }

  async function loadKidProfile(kidId) {
    setIsLoadingKid(true);
    setError("");

    try {
      const [kidPayload, dashboardPayload] = await Promise.all([
        readJson(await fetch(`/api/kids/${kidId}`)),
        readJson(await fetch(`/api/kids/${kidId}/dashboard`)),
      ]);

      setKid(kidPayload.kid);
      setDashboard(dashboardPayload.stats);
      setQuestions([]);
      setReadingForm({
        ...DEFAULT_READING_FORM,
        date: new Date().toISOString().slice(0, 10),
        bookTitle: kidPayload.kid.currentBooks?.[0]?.title || "",
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoadingKid(false);
    }
  }

  useEffect(() => {
    loadKidOverview().catch((loadError) => {
      setError(loadError.message);
      setIsLoadingKid(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedKidId) {
      return;
    }

    loadKidProfile(selectedKidId);
  }, [selectedKidId]);

  const mathProgress = useMemo(() => {
    if (!questions.length) {
      return { resolved: 0, score: 0, readyToSave: false, totalAttempts: 0 };
    }

    const resolved = questions.filter((question) => question.locked).length;
    const score = questions.filter((question) => question.correct).length;
    const totalAttempts = questions.reduce((sum, question) => sum + question.attempts, 0);

    return {
      resolved,
      score,
      totalAttempts,
      readyToSave: resolved === questions.length,
    };
  }, [questions]);

  async function refreshSelectedKid() {
    if (!selectedKidId) {
      return;
    }

    await loadKidProfile(selectedKidId);
  }

  async function handleReadingSubmit(event) {
    event.preventDefault();
    setIsSavingReading(true);
    setError("");
    setSuccessMessage("");

    try {
      await readJson(
        await fetch(`/api/kids/${selectedKidId}/reading-sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(readingForm),
        })
      );

      setSuccessMessage("Reading session saved.");
      setReadingForm((currentForm) => ({
        ...DEFAULT_READING_FORM,
        bookTitle: currentForm.bookTitle,
      }));
      await refreshSelectedKid();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSavingReading(false);
    }
  }

  async function startMathGame() {
    setIsGeneratingMath(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = await readJson(await fetch(`/api/kids/${selectedKidId}/math-questions`));
      setQuestions(
        payload.questions.map((question) => ({
          ...question,
          userAnswer: "",
          attempts: 0,
          locked: false,
          correct: false,
          feedback: "",
        }))
      );
    } catch (mathError) {
      setError(mathError.message);
    } finally {
      setIsGeneratingMath(false);
    }
  }

  function updateQuestion(index, updates) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...updates } : question
      )
    );
  }

  function checkQuestion(index) {
    const question = questions[index];

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
    setIsSavingMath(true);
    setError("");
    setSuccessMessage("");

    try {
      await readJson(
        await fetch(`/api/kids/${selectedKidId}/math-games`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playedAt: new Date().toISOString(),
            questions: questions.map((question) => ({
              prompt: question.prompt,
              topic: question.topic,
              answer: question.answer,
              userAnswer: question.userAnswer,
              attempts: question.attempts,
            })),
          }),
        })
      );

      setQuestions([]);
      setSuccessMessage("Math game saved.");
      await refreshSelectedKid();
    } catch (mathError) {
      setError(mathError.message);
    } finally {
      setIsSavingMath(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-card">
          <span className="eyebrow">Kid Quest MVP</span>
          <h1>Reading wins. Math reps. Parent-ready stats.</h1>
          <p>
            A tiny learning tracker that shows off a clean MongoDB document model with embedded
            books, reading sessions, and math game history.
          </p>
          <div className="status-strip">
            <span className="chip">Next.js app router</span>
            <span className="chip">MongoDB Atlas + Mongoose</span>
            <span className="chip">Seeded with 2 kids</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Choose a child profile</h2>
            <p className="section-copy">Pick a kid to switch the Reading mode, Math mode, and dashboard.</p>
          </div>
        </div>

        <div className="kid-grid">
          {kids.map((kidOption) => (
            <button
              key={kidOption.id}
              type="button"
              className={`kid-button ${kidOption.id === selectedKidId ? "active" : ""}`}
              onClick={() =>
                startTransition(() => {
                  setSelectedKidId(kidOption.id);
                  setMode("reading");
                  setSuccessMessage("");
                })
              }
            >
              <div className="kid-topline">
                <span
                  className="avatar-dot"
                  style={{ backgroundColor: kidOption.avatarColor }}
                  aria-hidden="true"
                />
                <strong>{kidOption.name}</strong>
              </div>
              <span className="muted">Age {kidOption.age}</span>
              <span className="tiny">{kidOption.currentBookCount} current books</span>
            </button>
          ))}
        </div>
      </section>

      {error ? <p className="message error">{error}</p> : null}
      {successMessage ? <p className="message success">{successMessage}</p> : null}

      {isLoadingKid || isPending ? (
        <div className="section empty-state">Loading kid profile...</div>
      ) : null}

      {!isLoadingKid && kid && dashboard ? (
        <>
          <section className="section">
            <div className="section-header">
              <div>
                <h2 className="section-title">{kid.name}'s snapshot</h2>
                <p className="section-copy">Quick interview-friendly stats pulled from MongoDB data.</p>
              </div>
              <div className="tabs">
                <button
                  type="button"
                  className={`tab-button ${mode === "reading" ? "active" : ""}`}
                  onClick={() => setMode("reading")}
                >
                  Reading
                </button>
                <button
                  type="button"
                  className={`tab-button ${mode === "math" ? "active" : ""}`}
                  onClick={() => setMode("math")}
                >
                  Math
                </button>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <p className="stat-label">Total reading minutes</p>
                <p className="stat-value">{dashboard.totalReadingMinutes}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Reading streak</p>
                <p className="stat-value">{dashboard.readingStreak} days</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Math games saved</p>
                <p className="stat-value">{kid.mathGameCount}</p>
              </div>
            </div>
          </section>

          {mode === "reading" ? (
            <section className="section split">
              <div className="panel grid">
                <div>
                  <h3 className="panel-title">Current books</h3>
                  <p className="section-copy">Embedded book documents make it easy to fetch the full reading snapshot in one read.</p>
                </div>

                <div className="book-grid">
                  {kid.currentBooks.map((book) => {
                    const progress = Math.round((book.currentPage / book.totalPages) * 100);

                    return (
                      <article key={book.title} className="book-card">
                        <div>
                          <h4 className="card-title">{book.title}</h4>
                          <p className="muted">
                            {book.author} · {book.level}
                          </p>
                        </div>
                        <div>
                          <div className="progress-track" aria-hidden="true">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="tiny">
                            Page {book.currentPage} of {book.totalPages}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div>
                  <h3 className="panel-title">Recent reading</h3>
                  <div className="session-list">
                    {kid.readingSessions.map((session) => (
                      <div key={`${session.date}-${session.bookTitle}`} className="list-item">
                        <div>
                          <strong>{session.bookTitle}</strong>
                          <p className="muted tiny">{formatDate(session.date)}</p>
                        </div>
                        <div className="tiny">
                          {session.minutes} min · {session.pagesRead} pages
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form className="panel form-grid" onSubmit={handleReadingSubmit}>
                <div>
                  <h3 className="panel-title">Log a reading session</h3>
                  <p className="section-copy">Add the date, minutes, and pages read. The matching book progress updates too.</p>
                </div>

                <div className="field">
                  <label htmlFor="bookTitle">Book</label>
                  <select
                    id="bookTitle"
                    value={readingForm.bookTitle}
                    onChange={(event) =>
                      setReadingForm((currentForm) => ({
                        ...currentForm,
                        bookTitle: event.target.value,
                      }))
                    }
                  >
                    {kid.currentBooks.map((book) => (
                      <option key={book.title} value={book.title}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="readingDate">Date</label>
                  <input
                    id="readingDate"
                    type="date"
                    value={readingForm.date}
                    onChange={(event) =>
                      setReadingForm((currentForm) => ({
                        ...currentForm,
                        date: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="minutes">Minutes</label>
                  <input
                    id="minutes"
                    type="number"
                    min="1"
                    value={readingForm.minutes}
                    onChange={(event) =>
                      setReadingForm((currentForm) => ({
                        ...currentForm,
                        minutes: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="pagesRead">Pages read</label>
                  <input
                    id="pagesRead"
                    type="number"
                    min="0"
                    value={readingForm.pagesRead}
                    onChange={(event) =>
                      setReadingForm((currentForm) => ({
                        ...currentForm,
                        pagesRead: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="button-row">
                  <button className="button primary" type="submit" disabled={isSavingReading}>
                    {isSavingReading ? "Saving..." : "Save reading session"}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="section split">
              <div className="panel grid">
                <div>
                  <h3 className="panel-title">Math mode</h3>
                  <p className="section-copy">
                    Generate 10 simple questions, check answers, and save the game result with score
                    and attempts.
                  </p>
                </div>

                <div className="button-row">
                  <button className="button primary" type="button" onClick={startMathGame} disabled={isGeneratingMath}>
                    {isGeneratingMath ? "Building questions..." : "Generate 10 questions"}
                  </button>
                  {questions.length ? (
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setQuestions([])}
                      disabled={isSavingMath}
                    >
                      Clear game
                    </button>
                  ) : null}
                </div>

                {questions.length ? (
                  <>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <p className="stat-label">Checked</p>
                        <p className="stat-value">
                          {mathProgress.resolved}/{questions.length}
                        </p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Current score</p>
                        <p className="stat-value">{mathProgress.score}</p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Attempts</p>
                        <p className="stat-value">{mathProgress.totalAttempts}</p>
                      </div>
                    </div>

                    <div className="question-grid">
                      {questions.map((question, index) => (
                        <article key={question.id} className="question-card">
                          <div className="question-header">
                            <div>
                              <span className="topic-pill">{formatTopic(question.topic)}</span>
                              <h4 className="card-title">{question.prompt}</h4>
                            </div>
                            <span className="tiny">Attempts: {question.attempts}</span>
                          </div>

                          <div className="question-actions">
                            <input
                              type="number"
                              min="-100"
                              value={question.userAnswer}
                              disabled={question.locked}
                              onChange={(event) =>
                                updateQuestion(index, {
                                  userAnswer: event.target.value,
                                  feedback: "",
                                })
                              }
                            />
                            <button
                              className="button secondary"
                              type="button"
                              onClick={() => checkQuestion(index)}
                              disabled={question.locked || question.userAnswer === ""}
                            >
                              {question.locked ? "Done" : "Check"}
                            </button>
                          </div>

                          <p
                            className={`feedback ${
                              question.locked && question.correct
                                ? "success"
                                : question.locked && !question.correct
                                  ? "error"
                                  : ""
                            }`}
                          >
                            {question.feedback}
                          </p>
                        </article>
                      ))}
                    </div>

                    <div className="button-row">
                      <button
                        className="button primary"
                        type="button"
                        onClick={saveMathGame}
                        disabled={!mathProgress.readyToSave || isSavingMath}
                      >
                        {isSavingMath ? "Saving..." : "Save math game"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">No active math game yet. Generate a question set to begin.</div>
                )}
              </div>

              <div className="panel grid">
                <div>
                  <h3 className="panel-title">Recent math results</h3>
                  <p className="section-copy">Each saved game stays embedded in the kid document with its 10 question results.</p>
                </div>

                {kid.mathGames.length ? (
                  <div className="session-list">
                    {kid.mathGames.map((game) => (
                      <div key={game.id} className="list-item">
                        <div>
                          <strong>{formatDate(game.playedAt)}</strong>
                          <p className="muted tiny">Saved game result</p>
                        </div>
                        <div className="tiny">
                          {game.score}/10 · {game.attempts} attempts
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No saved math games yet.</div>
                )}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Parent dashboard</h2>
                <p className="section-copy">Recent activity plus rollups powered by one kid document and an aggregation pipeline.</p>
              </div>
            </div>

            <div className="split">
              <div className="panel">
                <h3 className="panel-title">Recent activity</h3>
                <div className="activity-list">
                  {dashboard.recentActivity.map((activity, index) => (
                    <div key={`${activity.type}-${activity.date}-${index}`} className="list-item">
                      <div>
                        <strong>{activity.label}</strong>
                        <p className="muted tiny">{formatDate(activity.date)}</p>
                      </div>
                      <span className="topic-pill">{activity.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel grid">
                <div>
                  <h3 className="panel-title">Math accuracy by topic</h3>
                  <p className="section-copy">This section is computed with a MongoDB aggregation over embedded math question documents.</p>
                </div>

                {dashboard.mathAccuracyByTopic.length ? (
                  <div className="accuracy-list">
                    {dashboard.mathAccuracyByTopic.map((topic) => (
                      <div key={topic.topic} className="list-item">
                        <div>
                          <strong>{formatTopic(topic.topic)}</strong>
                          <p className="muted tiny">
                            {topic.correctAnswers} correct of {topic.totalQuestions}
                          </p>
                        </div>
                        <div>{topic.accuracy}%</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No math accuracy yet. Save a game to populate this section.</div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
