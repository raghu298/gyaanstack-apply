import bank from "./questions.json";

// "Practise on GyaanStack" (GS-1): questions from the GyaanStack interview
// bank that fit an application. Only the questions ship with the app; the
// model answers are on gyaanstack.com/interview.

export const PRACTICE_URL = "https://gyaanstack.com/interview";

type Level = "fresher" | "mid" | "senior";
type BankSet = { id: string; name: string; qa: { id: string; q: string; l: string }[] };

export type PracticeQuestion = { id: string; question: string; set: string; level: Level };

/** What each set is about, as words a job posting would use. */
const SET_WORDS: Record<string, string[]> = {
  llm: ["llm", "large language model", "transformer", "gpt", "fine-tun", "fine tun", "tokeniz", "prompt"],
  rag: ["rag", "retrieval", "vector", "embedding", "semantic search", "pinecone", "faiss", "weaviate", "chroma", "qdrant", "milvus"],
  agents: ["agent", "agentic", "tool calling", "function calling", "autonomous"],
  lc: ["langchain", "langgraph", "llamaindex", "llama index"],
  ml: ["machine learning", "scikit", "sklearn", "xgboost", "regression", "classification", "model training", "feature engineering"],
  nlp: ["nlp", "natural language", "named entity", "text classification", "spacy", "bert", "sentiment"],
  py: ["python", "fastapi", "django", "flask", "oop", "pytest"],
  data: ["pandas", "numpy", "sql", "etl", "spark", "data pipeline", "data wrangling"],
  infer: ["inference", "serving", "vllm", "latency", "gpu", "quantiz", "triton", "throughput", "cost"],
  safety: ["safety", "guardrail", "security", "responsible ai", "bias", "prompt injection", "pii", "compliance"],
  evals: ["evaluation", "evals", "observability", "monitoring", "langsmith", "langfuse", "hallucination", "metrics"],
  sysd: ["system design", "architecture", "scalab", "distributed", "microservice"],
  code: ["coding agent", "claude code", "mcp", "model context protocol", "copilot", "cursor"],
  applied: ["production", "stakeholder", "end-to-end", "end to end", "deploy"],
  "agq-basics": ["agentic", "ai agent"],
  "agq-loop": ["agent loop", "react", "tool use", "planning"],
  "agq-rag": ["agentic rag", "retrieval", "rag"],
  "agq-reason": ["reasoning", "mcp", "chain of thought"],
  "agq-multi": ["multi-agent", "multi agent", "crewai", "autogen", "orchestrat"],
  "agq-safety": ["guardrail", "agent safety", "human in the loop", "human-in-the-loop"],
  "agq-prod": ["production", "mlops", "llmops", "deploy", "observability", "kubernetes", "docker"],
  "agq-adv": ["governance", "enterprise"],
};

/** Always worth a couple of questions, whatever the job. */
const ALWAYS = "behav";

/** The level a job title asks for. */
export function levelOf(title: string): Level {
  const t = title.toLowerCase();
  if (/\b(senior|sr\.?|lead|staff|principal|architect|manager|head)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|intern|fresher|graduate|entry|trainee|associate)\b/.test(t)) return "fresher";
  return "mid";
}

const near: Record<Level, Level[]> = { senior: ["senior", "mid"], mid: ["mid", "senior", "fresher"], fresher: ["fresher", "mid"] };

const count = (text: string, word: string) => text.split(word).length - 1;

/**
 * Up to `limit` questions for a job: the sets its title, requirements and
 * posting talk about most, at its level, plus two behavioural ones. The same
 * job always gets the same questions.
 */
export function practiceFor(
  job: { title: string; requirements: readonly { text: string; skill?: string | null }[]; posting: string },
  limit = 10,
  sets: readonly BankSet[] = (bank as { sets: BankSet[] }).sets,
): PracticeQuestion[] {
  const title = job.title.toLowerCase();
  const asked = job.requirements.map((r) => `${r.text} ${r.skill ?? ""}`).join(" ").toLowerCase();
  const posting = job.posting.toLowerCase();
  const all = `${title} ${asked} ${posting}`;

  const scored = sets
    .filter((set) => set.id !== ALWAYS)
    .map((set) => ({
      set,
      score: (SET_WORDS[set.id] ?? []).reduce((sum, word) => sum + count(title, word) * 3 + count(asked, word) * 2 + Math.min(count(posting, word), 3), 0),
    }))
    .filter(({ score }) => score > 0)
    .toSorted((a, b) => b.score - a.score || a.set.id.localeCompare(b.set.id))
    .slice(0, 4);

  const level = levelOf(job.title);
  const pick = (set: BankSet, n: number): PracticeQuestion[] =>
    set.qa
      .filter((qa) => near[level].includes(qa.l as Level))
      .map((qa) => ({ qa, overlap: (SET_WORDS[set.id] ?? []).filter((word) => qa.q.toLowerCase().includes(word) && all.includes(word)).length, rank: near[level].indexOf(qa.l as Level) }))
      .toSorted((a, b) => b.overlap - a.overlap || a.rank - b.rank || a.qa.id.localeCompare(b.qa.id))
      .slice(0, n)
      .map(({ qa }) => ({ id: qa.id, question: qa.q, set: set.name, level: qa.l as Level }));

  const behavioural = sets.find((set) => set.id === ALWAYS);
  const room = limit - (behavioural ? 2 : 0);
  const per = scored.length > 0 ? Math.max(1, Math.floor(room / scored.length)) : 0;
  const chosen = scored.flatMap(({ set }) => pick(set, per)).slice(0, room);
  return [...chosen, ...(behavioural ? pick(behavioural, limit - chosen.length >= 2 ? 2 : 0) : [])].slice(0, limit);
}
