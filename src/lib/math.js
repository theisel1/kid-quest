const TOPICS = ["addition", "subtraction", "multiplication"];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildQuestion(topic, index) {
  if (topic === "addition") {
    const left = randomBetween(1, 20);
    const right = randomBetween(1, 20);

    return {
      id: `q-${index + 1}`,
      topic,
      prompt: `${left} + ${right}`,
      answer: left + right,
    };
  }

  if (topic === "subtraction") {
    const right = randomBetween(1, 12);
    const answer = randomBetween(0, 12);
    const left = answer + right;

    return {
      id: `q-${index + 1}`,
      topic,
      prompt: `${left} - ${right}`,
      answer,
    };
  }

  const left = randomBetween(1, 10);
  const right = randomBetween(1, 10);

  return {
    id: `q-${index + 1}`,
    topic,
    prompt: `${left} x ${right}`,
    answer: left * right,
  };
}

export function generateMathQuestions(count = 10) {
  const seededTopics = Array.from({ length: count }, (_, index) => TOPICS[index % TOPICS.length]);
  const topicOrder = shuffle(seededTopics);

  return topicOrder.map((topic, index) => buildQuestion(topic, index));
}

export const SUPPORTED_TOPICS = TOPICS;
