// 2nd working except the chat history.
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Verbose flag
const VERBOSE = process.env.VERBOSE === 'true';

// Firestore setup
const admin = require('firebase-admin');
const serviceAccount = require('./licentra-firebase-adminsdk-lmhqs-fb1f4c6daa.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Fuse.js for fuzzy matching
const Fuse = require('fuse.js');

// LangGraph & Gemini imports
const { StateGraph, START ,END } = require("@langchain/langgraph");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { HumanMessage } = require("@langchain/core/messages");

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY2;
const MODEL_NAME = "gemini-1.5-pro";

// --- DATA ACCESS DESCRIPTION ---
const DATA_ACCESS_DESCRIPTION = `
You are GodsEye, an AI assistant for the CEO. You do NOT require any user-supplied workspaceId; all workspace and department IDs are auto-resolved.

Access methods:
• Use Firestore collectionGroup('department') to locate department documents by name.
• Under each department document, read the 'chat' subcollection for the given dateKey; each document has an array field "messages".
• Under each department document, read the 'dailyTask' subcollection for the given dateKey; each document has an array of taskData objects.
• Department metadata (id, name, timeCreated) is read directly from the department documents.
• Your own chat history with the CEO is at Workspaces/{workspaceId}/GodsEye/{uid}/chat/{dateKey}
• Make sure to check the chat history before crafting a response.

The agent auto-discovers paths and should never prompt the user for any ID.`;

// --- Prompt for summarization ---
const SUMMARIZATION_PROMPT = `
You are GodsEye, an executive assistant AI built by CEODesk. Your task is to provide a clear, detailed summary of department activities based on chat logs.

When summarizing, follow these guidelines:
1. Provide a comprehensive yet concise overview of key discussions and activities
2. Highlight important decisions, problems, and achievements
3. Identify actionable items or pending issues
4. Use clear, non-technical language accessible to all staff members
5. Organize information in a readable format with proper paragraphs
6. Maintain a professional, informative tone
7. People's Names should be in bold and departments name should be semi-bold.
8. You do not have access to any tools other then limited access to database, you don't have tools to contact or any access to physical world, don't do any promises related on that.
9. At the end just ask, "Is there anything else I can help you with?"

Chat logs are provided below. Create a breif summary that the CEO can quickly understand.
`;

// --- Conversational AI prompt ---
const CONVERSATIONAL_PROMPT = `
You are GodsEye, an executive assistant AI built by CEODesk. You have a friendly, helpful, and natural conversational style.

IMPORTANT GUIDELINES:
1. BE CONVERSATIONAL - respond like a helpful human assistant would, not like a robotic system
2. REMEMBER CONTEXT - refer to previous conversations when relevant
3. BE ADAPTABLE - if the CEO asks about something unrelated to department data, engage normally
4. ACKNOWLEDGE CONTENT GAPS - if asked about departments with no data, explain this naturally
5. USE NATURAL TRANSITIONS - when shifting topics or providing updates, do so smoothly
6. SHOW PERSONALITY - be warm, professional and occasionally use light humor when appropriate
7. ASK CLARIFYING QUESTIONS - if the query is ambiguous, ask for clarification
8. BE CONCISE - provide valuable information without unnecessary verbosity
9. FORMATTING - Format all people's names in BOLD (using **Name**) and department names in SEMI-BOLD (using *Department*)
10. AVOID PROMISES - Do not promise things you cannot do as you only have limited database access
11. END MESSAGES - End your responses with "Is there anything else I can help you with?"
12. ALWAYS CHECK CHAT HISTORY - Review the chat history before crafting your response

CRITICAL: YOU MUST USE THE PROVIDED CHAT HISTORY TO ANSWER QUESTIONS ABOUT PREVIOUS CONVERSATIONS. When asked about previous questions, messages, or topics, reference the actual content in the conversation history rather than stating there is no history.

Your conversation history and the CEO's current query are provided below. Respond in a natural, helpful manner.
`;

// --- Helpers ---
async function getAllDepartmentDocs() {
  try {
    const snapshot = await db.collectionGroup('department').get();
    return snapshot.docs.map(doc => ({ name: doc.data().name, ref: doc.ref }));
  } catch (error) {
    console.error('[getAllDepartmentDocs] Error:', error.stack || error);
    throw error;
  }
}

async function getDepartmentDocRef(departmentName) {
  try {
    const docs = await getAllDepartmentDocs();
    // Enable score in Fuse.js
    const fuse = new Fuse(docs, { keys: ['name'], threshold: 0.3, includeScore: true });
    const results = fuse.search(departmentName);
    if (results.length) {
      const { item: matched, score } = results[0];
      if (VERBOSE) {
        const scoreDisplay = score != null ? score.toFixed(2) : 'N/A';
        console.warn(`[getDepartmentDocRef] Fuzzy matched '${matched.name}' for '${departmentName}' (score ${scoreDisplay})`);
      }
      return matched.ref;
    }
    if (VERBOSE) console.warn(`[getDepartmentDocRef] No match for '${departmentName}'`);
    return null;
  } catch (error) {
    console.error('[getDepartmentDocRef] Error:', error.stack || error);
    throw error;
  }
}

async function retrieveChatsFromDB(departmentName, date) {
  try {
    const deptRef = await getDepartmentDocRef(departmentName);
    if (!deptRef) {
      console.warn(`[retrieveChatsFromDB] Department '${departmentName}' not found.`);
      return [];
    }
    const chatDoc = await deptRef.collection('chat').doc(date).get();
    if (!chatDoc.exists) return [];
    const { messages = [] } = chatDoc.data();
    return messages.map(msg => {
      const ts = msg.timestamp;
      const dateObj = ts.toDate ? ts.toDate() : new Date(ts);
      const time = dateObj.toLocaleTimeString('en-US', { hour12: false });
      return `[${time}] ${msg.message_by}: ${msg.message}`;
    });
  } catch (error) {
    console.error('[retrieveChatsFromDB] Error fetching chats:', error.stack || error);
    return [];
  }
}

async function retrieveTasksFromDB(departmentName, date) {
  try {
    const deptRef = await getDepartmentDocRef(departmentName);
    if (!deptRef) {
      console.warn(`[retrieveTasksFromDB] Department '${departmentName}' not found.`);
      return [];
    }
    const taskDoc = await deptRef.collection('dailyTask').doc(date).get();
    if (!taskDoc.exists) return [];
    const { tasks = [] } = taskDoc.data();
    return tasks.map(task => {
      return `- ${task.text || 'Untitled task'}: (Status: ${task.completed === true? 'task completed' : 'task not completed'}) (finish by Date: ${task.finishDate || 'No finiish date added'}): User: ${task.user}: User Title: ${task.title}`;
    });
  } catch (error) {
    console.error('[retrieveTasksFromDB] Error fetching tasks:', error.stack || error);
    return [];
  }
}

// text
// "Meeting with a US client from Ycombinator"
// (string)

// timestamp
// "2025-04-25T11:58:11.941Z"
// (string)

// title
// "CEO"
// (string)

// user
// "Santosh patil"

// Enhanced function to retrieve chat history with the CEO
async function retrieveChatHistory(workspaceId, uid, date) {
  try {
    if (!workspaceId || !uid) {
      if (VERBOSE) console.warn('[retrieveChatHistory] Missing workspaceId or uid');
      return [];
    }
    
    const chatRef = db.collection('Workspaces').doc(workspaceId)
                      .collection('GodsEye').doc(uid)
                      .collection('chat').doc(date);
    
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) return [];
    
    const { messages = [] } = chatDoc.data();
    return messages.map(msg => {
      return {
        role: msg.sender === 'GodsEye' ? 'assistant' : 'user',
        content: msg.message,
        timestamp: msg.timestamp
      };
    }).sort((a, b) => {
      // Sort by timestamp if available
      if (a.timestamp && b.timestamp) {
        const timeA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeA - timeB;
      }
      return 0;
    });
  } catch (error) {
    console.error('[retrieveChatHistory] Error:', error.stack || error);
    return [];
  }
}

// Function to get all workspaces
async function getWorkspaceIds() {
  try {
    const snapshot = await db.collection('Workspaces').get();
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('[getWorkspaceIds] Error:', error.stack || error);
    return [];
  }
}

// Function to find GodsEye users in a workspace
async function getGodsEyeUsers(workspaceId) {
  try {
    if (!workspaceId) return [];
    
    const snapshot = await db.collection('Workspaces').doc(workspaceId)
                        .collection('GodsEye').get();
    
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('[getGodsEyeUsers] Error:', error.stack || error);
    return [];
  }
}

// Enhanced function to retrieve recent conversation history - more aggressive with history gathering
async function getRecentChatHistory() {
  try {
    // Get today's date and previous days (expanded to 7 days to ensure more history is captured)
    const today = new Date();
    const dates = [];
    
    // Get the last 7 days
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      dates.push(day.toISOString().split('T')[0]);
    }
    
    // Get all workspaces
    const workspaceIds = await getWorkspaceIds();
    
    let allHistory = [];
    
    // For each workspace and date, try to get history
    for (const workspaceId of workspaceIds) {
      const users = await getGodsEyeUsers(workspaceId);
      
      for (const uid of users) {
        for (const date of dates) {
          const history = await retrieveChatHistory(workspaceId, uid, date);
          if (history.length > 0) {
            allHistory = allHistory.concat(history);
            if (VERBOSE) console.log(`[getRecentChatHistory] Retrieved ${history.length} messages from ${workspaceId}/${uid}/${date}`);
          }
        }
      }
    }
    
    // Sort by timestamp if available
    allHistory.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        const timeA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeA - timeB;
      }
      return 0;
    });
    
    // Return last 30 messages instead of 20 for better context
    const lastMessages = allHistory.slice(-30);
    
    if (VERBOSE) console.log(`[getRecentChatHistory] Total messages retrieved: ${allHistory.length}, returning last ${lastMessages.length}`);
    console.log(lastMessages);
    return lastMessages;
  } catch (error) {
    console.error('[getRecentChatHistory] Error:', error.stack || error);
    // Return a default empty history rather than failing
    return [];
  }
}

// Add new chat history verification function
async function verifyHistoryAccess() {
  try {
    const history = await getRecentChatHistory();
    if (VERBOSE) console.log(`[verifyHistoryAccess] Retrieved ${history.length} messages from chat history`);
    return history.length > 0;
  } catch (error) {
    console.error('[verifyHistoryAccess] Error checking history access:', error.stack || error);
    return false;
  }
}

function parseDate(query) {
  try {
    const isoMatch = query.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) return isoMatch[0];
    const slashMatch = query.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
      const [ , d, m, y ] = slashMatch;
      const day = d.padStart(2,'0');
      const month = m.padStart(2,'0');
      const year = y.length===2?`20${y}`:y;
      return `${year}-${month}-${day}`;
    }
    const wordMatch = query.match(/(\d{1,2})(?:st|nd|rd|th)?\s*of\s*(\w+)/i);
    if (wordMatch) {
      const day = wordMatch[1].padStart(2,'0');
      const monthNames = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06', july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };
      const month = monthNames[wordMatch[2].toLowerCase()] || '01';
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}`;
    }
    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('[parseDate] Error:', error.stack || error);
    return new Date().toISOString().split('T')[0];
  }
}

// Format date to more readable format
function formatDate(isoDate) {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    return isoDate;
  }
}

// Helper to determine if query is about department data
function isDepartmentQuery(query) {
  const dataQueries = [
    'status', 'update', 'report', 'summary', 'activities',
    'what\'s happening', 'what is happening', 'progress', 'news',
    'today', 'yesterday', 'department', 'team', 'activity',
    'going on', 'briefing'
  ];
  
  // Special case - if query is about chat history/memory, it's not a department query
  const historyQueries = [
    'remember', 'what did i', 'previous', 'last time', 'earlier', 
    'before', 'first question', 'earlier question', 'previous question',
    'what was i', 'what have we', 'our conversation', 'our discussion'
  ];
  
  const lowerQuery = query.toLowerCase();
  
  // Check if it's specifically about history/memory
  if (historyQueries.some(term => lowerQuery.includes(term))) {
    return false; // Not a department query, it's a conversational query about history
  }
  
  return dataQueries.some(term => lowerQuery.includes(term));
}

// --- LangGraph Nodes ---
const agentState = {
  ceo_query: { value: null },
  chat_history: { value: null },
  is_data_query: { value: null },
  parsed_departments: { value: null },
  parsed_date: { value: null },
  chat_logs: { value: null },
  task_data: { value: null },
  llm_summary: { value: null },
  final_response: { value: null },
  error_message: { value: null },
  history_available: { value: null }
};

// Enhanced chat history node
async function get_chat_history_node(state) {
  try {
    const history = await getRecentChatHistory();
    const historyAvailable = history && history.length > 0;
    
    if (VERBOSE) {
      console.log(`[get_chat_history_node] Retrieved ${history.length} history items`);
      if (historyAvailable) {
        console.log(`[get_chat_history_node] First message: ${JSON.stringify(history[0])}`);
        console.log(`[get_chat_history_node] Last message: ${JSON.stringify(history[history.length-1])}`);
      }
    }
    
    return { 
      chat_history: history, 
      history_available: historyAvailable,
      error_message: null 
    };
  } catch(error) {
    console.error('[get_chat_history_node] Error:', error.stack || error);
    return { 
      chat_history: [], 
      history_available: false,
      error_message: error.message 
    };
  }
}

async function determine_query_type_node(state) {
  try {
    const query = state.ceo_query;
    const isDataQuery = isDepartmentQuery(query);
    
    return { is_data_query: isDataQuery, error_message: null };
  } catch(error) {
    console.error('[determine_query_type_node] Error:', error.stack || error);
    return { is_data_query: true, error_message: error.message }; // Default to data query on error
  }
}

async function conversational_response_node(state) {
  try {
    const query = state.ceo_query;
    const history = state.chat_history || [];
    const historyAvailable = state.history_available || false;
    
    // Format chat history for the LLM with more explicit formatting
    let formattedHistory = "";
    
    if (history.length > 0) {
      formattedHistory = history.map((msg, index) => 
        `[Message ${index + 1}] ${msg.role === 'user' ? 'CEO' : 'GodsEye'}: ${msg.content}`
      ).join('\n\n');
    } else {
      formattedHistory = "No previous conversation history available.";
    }
    
    // Add special handling for memory/history related queries
    const isMemoryQuery = query.toLowerCase().includes('remember') || 
                          query.toLowerCase().includes('first question') ||
                          query.toLowerCase().includes('previous');
    
    let specialInstructions = "";
    if (isMemoryQuery) {
      specialInstructions = `
THIS IS A MEMORY/HISTORY RELATED QUERY. The CEO is asking about previous conversation.
${historyAvailable ? 
  "You have access to chat history, so PROVIDE A SPECIFIC ANSWER based on the actual history." : 
  "You have no chat history available, so politely explain that while you can't access specific past conversations at the moment, you're happy to help with their current needs."}
`;
    }
    
    const prompt = `${CONVERSATIONAL_PROMPT}

${specialInstructions}

CONVERSATION HISTORY:
${formattedHistory}

CURRENT QUERY:
CEO: ${query}

Please respond as GodsEye in a natural, conversational manner. Remember to format people's names in BOLD (using **Name**) and department names in SEMI-BOLD (using *Department*). End your response with "Is there anything else I can help you with?"`;

    const llm = new ChatGoogleGenerativeAI({ 
      apiKey: GEMINI_API_KEY, 
      model: MODEL_NAME,
      temperature: 0.7 // Higher temperature for more natural responses
    });
    
    const resp = await llm.invoke([new HumanMessage(prompt)]);
    const response = resp.content.trim();
    
    // Add signature only if it's not already there
    const signature = "*Generated by GodsEye, an AI assistant built and trained by CEODesk.*";
    let finalResponse = response.includes(signature) ? response : `${response}\n\n${signature}`;
    
    // Ensure response ends with the standard question if it doesn't already
    if (!finalResponse.includes("Is there anything else I can help you with?")) {
      finalResponse = finalResponse.replace(signature, "Is there anything else I can help you with?\n\n" + signature);
    }
    
    return { final_response: finalResponse, error_message: null };
  } catch(error) {
    console.error('[conversational_response_node] Error:', error.stack || error);
    return { 
      final_response: `I'm sorry, I couldn't process your request properly. Let's try again with a different question.\n\nIs there anything else I can help you with?\n\n*Generated by GodsEye, an AI assistant built and trained by CEODesk.*`, 
      error_message: error.message 
    };
  }
}

async function parse_query_node(state) {
  try {
    const query = state.ceo_query;
    const docs = await getAllDepartmentDocs();
    const deptNames = docs.map(d => d.name);
    const llm = new ChatGoogleGenerativeAI({ apiKey: GEMINI_API_KEY, model: MODEL_NAME, temperature: 0.2 });
    const prompt = `You are an expert. CEO asks: "${query}". Available departments: ${deptNames.join(', ')}. Return a JSON array of mentioned departments or ["all"].`;
    const resp = await llm.invoke([new HumanMessage(prompt)]);
    let parsed;
    try { parsed = JSON.parse(resp.content.trim().replace(/```json|```/g, '')); } catch(e) { throw new Error('Failed parsing LLM JSON: ' + e.message); }
    const date = parseDate(query);
    let chosen = parsed.includes('all') ? deptNames : parsed.filter(d => deptNames.includes(d));
    if (!chosen.length) chosen = deptNames;
    return { parsed_departments: chosen, parsed_date: date, error_message: null };
  } catch(error) {
    console.error('[parse_query_node] Error:', error.stack || error);
    return { parsed_departments: null, parsed_date: null, error_message: error.message };
  }
}

async function retrieve_data_node(state) {
  try {
    const { parsed_departments, parsed_date } = state;
    if (!parsed_departments) throw new Error('No departments parsed');
    
    const chatLogs = {};
    const taskData = {};
    
    for (const dept of parsed_departments) {
      chatLogs[dept] = await retrieveChatsFromDB(dept, parsed_date);
      taskData[dept] = await retrieveTasksFromDB(dept, parsed_date);
    }
    
    return { chat_logs: chatLogs, task_data: taskData, error_message: null };
  } catch(error) {
    console.error('[retrieve_data_node] Error:', error.stack || error);
    return { chat_logs: null, task_data: null, error_message: error.message };
  }
}

async function summarize_data_node(state) {
  try {
    const { chat_logs, task_data, parsed_date, ceo_query, chat_history } = state;
    if (!chat_logs) throw new Error('No chat logs');
    
    // Format chat history for context
    const formattedHistory = (chat_history || []).map(msg => 
      `${msg.role === 'user' ? 'CEO' : 'GodsEye'}: ${msg.content}`
    ).slice(-5).join('\n\n'); // Use just the last few messages for context
    
    const summaries = {};
    for (const dept in chat_logs) {
      const logs = chat_logs[dept];
      const tasks = task_data[dept];
      
      const prompt = `${SUMMARIZATION_PROMPT}
CEO query: "${ceo_query}"
Department: ${dept}
Date: ${formatDate(parsed_date)}

RECENT CONVERSATION CONTEXT:
${formattedHistory || "No recent conversation context available."}

CHAT LOGS:
${logs.length ? logs.join('\n') : 'No chat activity recorded for this day.'}

DAILY TASKS:
${tasks.length ? tasks.join('\n') : 'No tasks recorded for this day.'}

Please provide a detailed summary of the department's activities and tasks in clear, conversational language. Format people's names in BOLD (using **Name**) and department names in SEMI-BOLD (using *Department*). End your summary with "Is there anything else I can help you with?"`;

      const llm = new ChatGoogleGenerativeAI({ 
        apiKey: GEMINI_API_KEY, 
        model: MODEL_NAME, 
        temperature: 0.4 // Slightly higher temperature for more natural language
      });
      
      const resp = await llm.invoke([new HumanMessage(prompt)]);
      summaries[dept] = resp.content.trim() || 'No significant activity or tasks recorded for this department today.';
    }
    
    return { llm_summary: summaries, error_message: null };
  } catch(error) {
    console.error('[summarize_data_node] Error:', error.stack || error);
    return { llm_summary: null, error_message: error.message };
  }
}

async function format_response_node(state) {
  try {
    const { llm_summary, parsed_date, parsed_departments, chat_history, ceo_query } = state;
    if (!llm_summary) throw new Error('No summaries available');
    
    // Format chat history for context
    const formattedHistory = (chat_history || []).slice(-5).map(msg => 
      `${msg.role === 'user' ? 'CEO' : 'GodsEye'}: ${msg.content}`
    ).join('\n\n');
    
    const formattedDate = formatDate(parsed_date);
    
    // Build a context-aware prompt for the final response
    const prompt = `${CONVERSATIONAL_PROMPT}

CONVERSATION HISTORY:
${formattedHistory || "No previous conversation history available."}

CURRENT QUERY:
CEO: ${ceo_query}

DEPARTMENT SUMMARIES FOR ${formattedDate}:
${Object.entries(llm_summary).map(([dept, summary]) => `${dept}: ${summary}`).join('\n\n')}

Create a natural, conversational response that incorporates the department summaries in a way that feels like a helpful assistant speaking. Include all important information from the summaries while maintaining a friendly, conversational tone. Don't use headers unless necessary for clarity.

IMPORTANT FORMATTING:
1. Format all people's names in BOLD using markdown (**Name**)
2. Format all department names in SEMI-BOLD using markdown (*Department*)
3. End your response with "Is there anything else I can help you with?"`;

    const llm = new ChatGoogleGenerativeAI({ 
      apiKey: GEMINI_API_KEY, 
      model: MODEL_NAME, 
      temperature: 0.6 // Higher temperature for more natural responses
    });
    
    const resp = await llm.invoke([new HumanMessage(prompt)]);
    let response = resp.content.trim();
    
    // Add signature only if it's not already there
    const signature = "*Generated by GodsEye, an AI assistant built and trained by CEODesk.*";
    let finalResponse = response.includes(signature) ? response : `${response}\n\n${signature}`;
    
    // Ensure response ends with the standard question if it doesn't already
    if (!finalResponse.includes("Is there anything else I can help you with?")) {
      finalResponse = finalResponse.replace(signature, "Is there anything else I can help you with?\n\n" + signature);
    }
    
    return { final_response: finalResponse };
  } catch(error) {
    console.error('[format_response_node] Error:', error.stack || error);
    return { final_response: `Error formatting response: ${error.message}` };
  }
}

async function handle_error_node(state) {
  const msg = state.error_message || 'Unknown error';
  return { 
    final_response: `I'm sorry, I ran into a technical issue while processing your request. ${VERBOSE ? `Error: ${msg}` : 'Let me know if you would like to try again with more specific details.'}\n\nIs there anything else I can help you with?\n\n*Generated by GodsEye, an AI assistant built and trained by CEODesk.*`
  };
}

// --- Workflow ---
const workflow = new StateGraph({ channels: agentState });

// Add nodes
workflow.addNode('get_chat_history', get_chat_history_node);
workflow.addNode('determine_query_type', determine_query_type_node);
workflow.addNode('conversational_response', conversational_response_node);
workflow.addNode('parse_query', parse_query_node);
workflow.addNode('retrieve_data', retrieve_data_node);
workflow.addNode('summarize_data', summarize_data_node);
workflow.addNode('format_response', format_response_node);
workflow.addNode('handle_error', handle_error_node);

// Set entry point
workflow.addEdge(START, 'get_chat_history');

// Define edges
workflow.addEdge('get_chat_history', 'determine_query_type');
workflow.addConditionalEdges(
  'determine_query_type',
  (s) => s.is_data_query ? 'data_path' : 'conversation_path',
  {
    'data_path': 'parse_query',
    'conversation_path': 'conversational_response'
  }
);

workflow.addConditionalEdges(
  'parse_query', 
  (s) => s.error_message ? 'error' : 'continue',
  { 
    'continue': 'retrieve_data', 
    'error': 'handle_error' 
  }
);

workflow.addConditionalEdges(
  'retrieve_data', 
  (s) => s.error_message ? 'error' : 'continue',
  { 
    'continue': 'summarize_data', 
    'error': 'handle_error' 
  }
);

workflow.addConditionalEdges(
  'summarize_data', 
  (s) => s.error_message ? 'error' : 'continue',
  { 
    'continue': 'format_response', 
    'error': 'handle_error' 
  }
);

workflow.addEdge('format_response', END);
workflow.addEdge('conversational_response', END);
workflow.addEdge('handle_error', END);

const graph = workflow.compile();

// --- Express API ---
const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/query', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });
  try {
    const finalState = await graph.invoke({ ceo_query: query });
    res.json({ response: finalState.final_response });
  } catch(error) {
    console.error('[API] Fatal error:', error.stack || error);
    if (VERBOSE) res.status(500).json({ error: error.message, stack: error.stack });
    else res.status(500).json({ 
      error: "I'm sorry, I encountered an issue processing your request. Let's try a different approach or question.",
      response: "I'm sorry, I encountered an issue processing your request. Let's try a different approach or question.\n\nIs there anything else I can help you with?\n\n*Generated by GodsEye, an AI assistant built and trained by CEODesk.*"
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`GodsEye API running on port ${PORT} (VERBOSE=${VERBOSE})`));


























// Below is a list of every helper you have that writes data to Firestore, the path it uses, and a brief note on what it stores:

// 1. src/firebase/addUserDailyTask.js
// • addUserDailyTask(uid, workspaceId, departmentId, taskData)
// – Path: Users/{uid}/joined_workspace/{workspaceId}/Daily Task/{dateKey}
// – Stores: an array of task objects (id, text, completed, departmentId, timestamp, user name/uid, title, finishDate).

// • updateUserDailyTaskCompletion(uid, workspaceId, departmentId, dateKey, taskId, completed)
// – Same path as above
// – Updates the completed flag on the matching task.

// 2. src/firebase/config.js

// • createUser(userData)
// – Path: Users/{newUid}
// – Stores: user profile (uid, firstname, lastname, email, create time, empty joined_workspace map).

// • createWorkspace(workspaceData, userId)
// – Path: Workspaces/{workspaceId}
// – Stores: workspace info (id, companyName, description, industry, size, timestamps, createdBy, myDesk template).

// • joinWorkspace(userId, workspaceId, userTitle)
// – Path: Users/{userId}/joined_workspace/{workspaceId}
// – Stores: membership doc (workspace id, name, description, lastAccessedDate, size, UsersTitle).

// • inviteUserToWorkspace(workspaceId, userEmail, userTitle)
// – Path: Workspaces/{workspaceId} (field invitations.{invitationId})
// – Stores: one invitation entry with id, email, title, status, time.

// • createDepartment(workspaceId, departmentData)
// – Path: Workspaces/{workspaceId}/department/{departmentId}
// – Stores: department doc (id, name, time).

// • addChatMessage(workspaceId, departmentId, dateKey, message)
// – Path: Workspaces/{workspaceId}/department/{departmentId}/chat/{dateKey}
// – Stores: array of chat messages (message_by, message_by_uid, message, title, timestamp).

// • addDailyTask(workspaceId, departmentId, dateKey, taskData)
// – Path: Workspaces/{workspaceId}/department/{departmentId}/dailyTask/{dateKey}
// – Stores: array of “global” taskData objects you pass in.

// • deleteDailyTask(workspaceId, departmentId, dateKey, taskId)
// – Same path as above
// – Removes one task by filtering out its id.

// • updateDailyTaskCompletion(workspaceId, departmentId, dateKey, taskId, completed)
// – Same path
// – Toggles a task’s completed flag.

// • addGodsEyeConversation(workspaceId, conversationData)
// – Path: Workspaces/{workspaceId}/GodsEye/{conversationData.id}
// – Stores: a top‑level CEO conversation object (id, metadata, etc).

// • addGodsEyeChatMessage(workspaceId, uid, dateKey, message)
// – Path: Workspaces/{workspaceId}/GodsEye/{uid}/chat/{dateKey}
// – Stores: array of in‑GodsEye chat messages (similar shape to department chat).

// 3. Other writes (storage‑related or auth) live in config.js but don’t hit Firestore directly (e.g. file uploads use Firebase Storage; auth calls use Authentication API).

// Let me know if you need any more detail on any of these!
