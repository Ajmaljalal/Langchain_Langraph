import { StateGraph, Annotation } from "@langchain/langgraph";

// 1. Define annotation
const StateAnnotation = Annotation.Root({
  mood: Annotation<"happy" | "sad" | "neutral">({
    reducer: (_prev, update) => update,
    default: () => "neutral",
  }),
  log: Annotation<string[]>({
    reducer: (prev, update) => prev.concat(update),
    default: () => [],
  }),
});

type State = typeof StateAnnotation.State;

// 2. Define Nodes

const checkMood = async (state: State) => {
  // logs what mode was given
  return { log: [`checkMood: mood is "${state.mood}"`] };
}

const happyPath = async (state: State) => {
  return { log: [`${state.mood} path: share some good news!`] };
};

const sadPath = async (state: State) => {
  return { log: [`${state.mood} path: sending virtual hugs!`] };
};

const neutralPath = async (state: State) => {
  return { log: [` ${state.mood} path: carry on as usual.`] };
};

// 3. Build the graph

const graph = new StateGraph(StateAnnotation)
  // nodes
  .addNode("checkMood", checkMood)
  .addNode("happyPath", happyPath)
  .addNode("sadPath", sadPath)
  .addNode("neutralPath", neutralPath)

  // edges

  .addEdge("__start__", "checkMood")
  .addEdge("happyPath", "__end__")
  // branch from checkmood to one of three paths
  .addConditionalEdges("checkMood", (state) => {
    return state.mood
  })
  .addEdge("sadPath", "__end__")
  .addEdge("neutralPath", "__end__")

  // compile the graph
  .compile()


// 4. Run the graph with different moods
async function runMood(mood: State["mood"]) {
  console.log("\n--- Running with mood:", mood, "---");
  const result = await graph.invoke({ mood, log: ["Start"] });
  console.log(result.log.map((l) => " - " + l).join("\n"));
}

runMood("happy")
runMood("sad")
runMood("neutral")
