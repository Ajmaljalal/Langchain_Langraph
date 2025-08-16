import { Annotation, StateGraph } from "@langchain/langgraph";

// 1. Define the state
const StateAnnotation = Annotation.Root({
  total: Annotation<number>({
    // last-write-wins
    reducer: (_prev, update) => update,
    default: () => 0,
  }),
  log: Annotation<string[]>({
    // append new log entries
    reducer: (prev, update) => prev.concat(update),
    default: () => [],
  }),
});

type State = typeof StateAnnotation.State;

// 2. Nodes

const addTwo = async (state: State): Promise<State> => {
  const next = state.total + 2;
  return {
    total: next,
    log: [...state.log, `addTwo: ${state.total} -> ${next}`]
  }
}

const square = async (state: State): Promise<State> => {
  const next = state.total * state.total;
  return {
    total: next,
    log: [...state.log, `sqaure: ${state.total} -> ${next}`]
  }
}

// 3. Build and run the graph
const graph = new StateGraph(StateAnnotation)
  .addNode("addTwo", addTwo)
  .addNode("square", square)
  .addEdge("__start__", "addTwo")
  .addEdge("addTwo", "square")
  .addEdge("square", "__end__")
  .compile();


console.log("[ready] invoking graph")

const result = await graph.invoke({
  total: 3,
  log: ["stat: 3"]
})

console.log("[done] log:\n - " + result.log.join("\n - "));