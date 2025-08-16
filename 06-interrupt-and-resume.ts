import { StateGraph, Annotation, MemorySaver } from "@langchain/langgraph";

// 1) State + reducers
const StateAnnotation = Annotation.Root({
  value: Annotation<number>({ reducer: (_p, u) => u, default: () => 0 }),
  approved: Annotation<boolean>({ reducer: (_p, u) => u, default: () => false }),
  log: Annotation<string[]>({ reducer: (p, u) => p.concat(u), default: () => [] }),
});
type State = typeof StateAnnotation.State;

// 2) Nodes
const prepare = async (s: State) => {
  const next = s.value + 5;
  return { value: next, log: [`prepare: value ${s.value} -> ${next}`] };
};

const confirm = async (_s: State) => {
  // In this example we never run any code here on the first pass,
  // because we set interruptBefore: ["confirm"] when compiling.
  return {};
};

const finalize = async (s: State) => {
  if (!s.approved) {
    return { log: ["finalize: blocked, not approved yet"] };
  }
  const next = s.value * 2;
  return { value: next, log: [`finalize: value*2 -> ${next}`] };
};

// 3) Checkpointer and graph with a static breakpoint before "confirm"
const checkpointer = new MemorySaver();
const graph = new StateGraph(StateAnnotation)
  .addNode("prepare", prepare)
  .addNode("confirm", confirm)
  .addNode("finalize", finalize)
  .addEdge("__start__", "prepare")
  .addEdge("prepare", "confirm")
  .addEdge("confirm", "finalize")
  .addEdge("finalize", "__end__")
  .compile({
    checkpointer,
    interruptBefore: ["confirm"], // pause here
  });

// 4) Run once, we’ll pause before "confirm"
async function main() {
  const cfg = { configurable: { thread_id: "demo-thread-1" } };

  console.log("=== First run: expect an interrupt BEFORE confirm ===");
  // On the first run, execution pauses before confirm.
  // Depending on your runner, you may get partial state back;
  // either way, nothing after confirm has executed yet.
  const partial = await graph.invoke({ value: 10, log: ["start value = 10"] }, cfg);
  console.log("Partial (paused) state:");
  console.log(partial);

  // 5) Provide the missing info and resume the SAME thread
  // You can "resume" by invoking again with the same thread_id.
  // If you need to add inputs (eg, human approval), pass them here.
  console.log("\n=== Resuming with approval ===");
  const final = await graph.invoke({ approved: true }, cfg);
  console.log("Final state after resume:");
  console.log(final);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
