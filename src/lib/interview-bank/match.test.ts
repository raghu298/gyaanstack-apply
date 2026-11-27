import { describe, expect, it } from "vitest";

import bank from "./questions.json";
import { levelOf, practiceFor } from "./match";

const job = (title: string, posting: string, requirements: string[] = []) => ({
  title,
  posting,
  requirements: requirements.map((text) => ({ text, skill: null })),
});

describe("practiceFor (GS-1)", () => {
  it("ships questions only, never the model answers", () => {
    for (const set of bank.sets) for (const qa of set.qa) expect(Object.keys(qa).sort()).toEqual(["id", "l", "q"]);
  });

  it("picks the sets a GenAI posting talks about, plus behavioural questions", () => {
    const questions = practiceFor(job("Senior GenAI Engineer", "Build RAG pipelines with LangChain and vector databases; deploy LLM agents.", ["RAG", "LangChain", "Python"]));
    expect(questions.length).toBe(10);
    const sets = new Set(questions.map((q) => q.set));
    expect(sets.has("RAG & Vector Databases")).toBe(true);
    expect(sets.has("Behavioural & Story Rounds for AI Roles")).toBe(true);
    expect(questions.every((q) => q.level === "senior" || q.level === "mid")).toBe(true);
  });

  it("gives the same questions for the same job", () => {
    const a = practiceFor(job("ML Engineer", "pandas, scikit-learn, SQL"));
    const b = practiceFor(job("ML Engineer", "pandas, scikit-learn, SQL"));
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
  });

  it("still has behavioural questions when nothing technical matches", () => {
    const questions = practiceFor(job("Office Manager", "Run the front desk."));
    expect(questions.length).toBe(2);
    expect(questions.every((q) => q.set.startsWith("Behavioural"))).toBe(true);
  });

  it("reads the level from the title", () => {
    expect(levelOf("Senior Software Engineer")).toBe("senior");
    expect(levelOf("AI Intern")).toBe("fresher");
    expect(levelOf("Machine Learning Engineer")).toBe("mid");
  });
});
