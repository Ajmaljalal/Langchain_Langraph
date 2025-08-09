import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";

// 1. Define the state type
type State = typeof MessagesAnnotation.State;

// 2. Define the node function
const botNode = async (state: State) => {
  // state.messages is an array of BaseMessage
  return {
    messages: [
      ...state.messages,
      new AIMessage("Hello! this is langGraph in action with no LLM yet!")
    ]
  }
}

// 3. Build the graph
const graph = new StateGraph(MessagesAnnotation)
  .addNode("bot", botNode)
  .addEdge("__start__", "bot") // connecting start node of the graph to bot
  .addEdge("bot", "__end__") // connection bot node to the end node
  .compile(); // produceds a runnable graph that can be invoked with initial state


// 4. Run the graph
// 4) Run once
const result = await graph.invoke({ messages: [] });

console.log("[done] result count:", result.messages.length);
console.log("[done] result contents:", result.messages.map(m => m.content));
