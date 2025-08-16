import { StateGraph, Annotation, MemorySaver, interrupt, Command } from "@langchain/langgraph";

// 1) State
const StateAnnotation = Annotation.Root({
  needs: Annotation<string>({ reducer: (_p, u) => u, default: () => "" }),
  age: Annotation<number>({ reducer: (_p, u) => u, default: () => 0 }),
  log: Annotation<string[]>({ reducer: (p, u) => p.concat(u), default: () => [] }),
});
type State = typeof StateAnnotation.State;

// 2) Nodes
const askAge = (s: State) => {
  // Pause here and surface a question + any helpful context
  const answer = interrupt({ question: "What is your age?", currentAge: s.age });
  // When resumed, interrupt(...) returns the provided value
  return {
    age: Number(answer),
    log: [`askAge: got age=${answer}`],
  };
};

const checkAdult = (s: State) => {
  const msg = s.age >= 18 ? "Adult ✅" : "Minor ❗";
  return { log: [`checkAdult: ${msg}`] };
};

// 3) Compile with a checkpointer
const checkpointer = new MemorySaver();
const graph = new StateGraph(StateAnnotation)
  .addNode("askAge", askAge)
  .addNode("checkAdult", checkAdult)
  .addEdge("__start__", "askAge")
  .addEdge("askAge", "checkAdult")
  .addEdge("checkAdult", "__end__")
  .compile({ checkpointer });

// 4) Run: first call pauses, second call resumes with a value
async function main() {
  const cfg = { configurable: { thread_id: "thread-dynamic-1" } };

  console.log("=== Run 1: will PAUSE inside askAge ===");
  // invoke() runs until the interrupt; to inspect the pause, fetch state or use stream()
  await graph.invoke({ log: ["start"] }, cfg);
  const paused = await graph.getState(cfg);
  console.log("Paused at:", paused.tasks?.[0]?.name, "interrupts:", paused.tasks?.[0]?.interrupts?.length);

  console.log("\n=== Run 2: RESUME with a value ===");
  // Supply the human's answer; interrupt(...) returns this value
  const final = await graph.invoke(new Command({ resume: 23 }), cfg);
  console.log("Final log:");
  for (const line of final.log) console.log(" -", line);
}

main().catch((e) => { console.error(e); process.exit(1); });
