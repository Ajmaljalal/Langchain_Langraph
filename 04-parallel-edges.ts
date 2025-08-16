import { StateGraph, Annotation } from "@langchain/langgraph";

// 1) State with simple merge rules
const StateAnnotation = Annotation.Root({
  value: Annotation<number>({
    reducer: (_prev, update) => update,
    default: () => 0,
  }),
  a: Annotation<number>({
    reducer: (_prev, update) => update,
    default: () => 0,
  }),
  b: Annotation<number>({
    reducer: (_prev, update) => update,
    default: () => 0,
  }),
  log: Annotation<string[]>({
    reducer: (prev, update) => prev.concat(update),
    default: () => [],
  }),
});
type State = typeof StateAnnotation.State;

// 2) Nodes
const fanOut = async (_state: State) => {
  // does not change state, only used to split into parallel paths
  return {};
};

const incBy1 = async (state: State) => {
  return {
    a: state.value + 1,
    log: [`incBy1 saw value=${state.value} set a=${state.value + 1}`],
  };
};

const mulBy3 = async (state: State) => {
  return {
    b: state.value * 3,
    log: [`mulBy3 saw value=${state.value} set b=${state.value * 3}`],
  };
};

const join = async (state: State) => {
  const combined = state.a + state.b;
  return {
    value: combined,
    log: [`join combined a+b = ${state.a} + ${state.b} = ${combined}`],
  };
};

// 3) Build graph
const graph = new StateGraph(StateAnnotation)
  .addNode("fanOut", fanOut)
  .addNode("incBy1", incBy1)
  .addNode("mulBy3", mulBy3)
  .addNode("join", join)

  // start, then split to two nodes in parallel
  .addEdge("__start__", "fanOut")
  .addEdge("fanOut", "incBy1")
  .addEdge("fanOut", "mulBy3")

  // both parallel nodes lead to join
  .addEdge("incBy1", "join")
  .addEdge("mulBy3", "join")

  .addEdge("join", "__end__")
  .compile();

// 4) Run
const result = await graph.invoke({
  value: 4,
  log: ["start value = 4"],
});

console.log("[done] value:", result.value);
console.log("[done] log:");
for (const line of result.log) console.log(" -", line);
