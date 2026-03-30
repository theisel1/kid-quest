import random


SUPPORTED_TOPICS = ["addition", "subtraction", "multiplication"]


def build_question(topic: str, index: int) -> dict:
    if topic == "addition":
        left = random.randint(1, 20)
        right = random.randint(1, 20)
        return {
            "id": f"q-{index + 1}",
            "topic": topic,
            "prompt": f"{left} + {right}",
            "answer": left + right,
        }

    if topic == "subtraction":
        right = random.randint(1, 12)
        answer = random.randint(0, 12)
        left = answer + right
        return {
            "id": f"q-{index + 1}",
            "topic": topic,
            "prompt": f"{left} - {right}",
            "answer": answer,
        }

    left = random.randint(1, 10)
    right = random.randint(1, 10)
    return {
        "id": f"q-{index + 1}",
        "topic": topic,
        "prompt": f"{left} x {right}",
        "answer": left * right,
    }


def generate_math_questions(count: int = 10) -> list[dict]:
    seeded_topics = [SUPPORTED_TOPICS[index % len(SUPPORTED_TOPICS)] for index in range(count)]
    random.shuffle(seeded_topics)
    return [build_question(topic, index) for index, topic in enumerate(seeded_topics)]
