import { StateGraph, Annotation } from "@langchain/langgraph";

/** ---------- Subgraph ---------- **/
const SubState = Annotation.Root({
  value: Annotation<number>({ reducer: (_p, u) => u, default: () => 0 }),
  temp: Annotation<number>({ reducer: (_p, u) => u, default: () => 0 }),
  log: Annotation<string[]>({ reducer: (p, u) => p.concat(u), default: () => [] }),
});
type Sub = typeof SubState.State;

const sgStep1 = async (s: Sub) => {
  const t = s.value * 2;
  return { temp: t, log: [`sub: step1 set temp = value*2 = ${t}`] };
};

const sgStep2 = async (s: Sub) => {
  const next = s.temp + 10;
  return { value: next, log: [`sub: step2 set value = temp+10 = ${s.temp}+10 = ${next}`] };
};

const subgraph = new StateGraph(SubState)
  .addNode("sgStep1", sgStep1)
  .addNode("sgStep2", sgStep2)
  .addEdge("__start__", "sgStep1")
  .addEdge("sgStep1", "sgStep2")
  .addEdge("sgStep2", "__end__")
  .compile();

/** ---------- Parent graph ---------- **/
const ParentState = Annotation.Root({
  value: Annotation<number>({ reducer: (_p, u) => u, default: () => 0 }),
  log: Annotation<string[]>({ reducer: (p, u) => p.concat(u), default: () => [] }),
});
type Parent = typeof ParentState.State;

const pre = async (s: Parent) => {
  const v = s.value + 1;
  return { value: v, log: [`parent: pre increment value -> ${v}`] };
};

// Use the *compiled subgraph* as a node in the parent graph
const graph = new StateGraph(ParentState)
  .addNode("pre", pre)
  .addNode("calc", subgraph)      // <— subgraph plugged in here
  .addEdge("__start__", "pre")
  .addEdge("pre", "calc")
  .addEdge("calc", "__end__")
  .compile();

/** ---------- Run ---------- **/
const result = await graph.invoke({ value: 3, log: ["start value = 3"] })

console.log("[done] value:", result.value);
console.log("[done] log:\n" + result.log.map(l => " - " + l).join("\n"));
