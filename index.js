const { App } = require('@slack/bolt');
const ollama = require('ollama').default; // Official Ollama Node library
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Master Persona System Prompt to ensure consistency across all commands
const BUTLER_SYSTEM_PROMPT = `
You are Fluffer, a highly distinguished, ultra-formal, traditional British butler serving elite tech lords. 
You speak with absolute eloquence, vocabulary choice, and dry wit. Use terms like "Sir", "Mum", "My Lords", "Regrettably", and "Splendid". 
Your tone must ALWAYS be that of a butler polishing silver, ironed morning papers, and serving tea, regardless of what the user asks.
Keep responses concise, formatted cleanly for Slack markdown, and completely in character.
`;

/**
 * Dynamic Helper: Query Ollama with the system persona
 */
async function queryButlerAI(userInstructions) {
  try {
    const response = await ollama.chat({
      model: 'llama3', // Or your chosen model like 'mistral' or 'phi3'
      messages: [
        { role: 'system', content: BUTLER_SYSTEM_PROMPT },
        { role: 'user', content: userInstructions }
      ],
      options: { temperature: 0.7 }
    });
    return response.message.content;
  } catch (error) {
    console.error("[Ollama AI Generation Error]:", error);
    return "Forgive me, Sir. It appears my neural synapses have suffered a temporary disruption while crafting my response.";
  }
}

/**
 * Dynamic Helper: Fetch Live Weather data via a free API
 */
async function getLiveWeather(city) {
  try {
    // Using wttr.in format to easily parse text parameters without API keys
    const res = await fetch(`https://wttr.in{encodeURIComponent(city)}?format=%C+%t+with+winds+at+%w`);
    if (!res.ok) throw new Error("Weather service unreachable");
    return await res.text();
  } catch (err) {
    return "overcast and thoroughly uninviting, with a high chance of structural dampness";
  }
}

/**
 * Dynamic Helper: Fetch Live International Space Station Position
 */
async function getISSPosition() {
  try {
    const res = await fetch('http://open-notify.org');
    const data = await res.json();
    if (data.message === "success" && data.iss_position) {
      return `Latitude: ${data.iss_position.latitude}, Longitude: ${data.iss_position.longitude}`;
    }
    throw new Error("Invalid payload structure");
  } catch (err) {
    return "unknown coordinates hidden entirely by atmospheric interference";
  }
}

/* ==========================================================================
   SLACK COMMAND HANDLERS
   ========================================================================== */

// 1. /fluffer-news: Generate fresh AI Satirical Tech Headlines
app.command('/fluffer-news', async ({ command, ack, say }) => {
  await ack();
  try {
    const aiPrompt = "Generate one completely absurd, highly exaggerated, fictional technology headline. Followed by a witty, butler-style dry remark about it.";
    const message = await queryButlerAI(aiPrompt);
    await say({ text: message, mrkdwn: true });
  } catch (err) {
    console.error("[Slash Command Failure]:", err.message);
  }
});

// 2. /fluffer-weather: Dynamic weather analysis matching the persona
app.command('/fluffer-weather', async ({ command, ack, say }) => {
  await ack();
  try {
    const targetCity = command.text.trim() || "London";
    const liveRawData = await getLiveWeather(targetCity);
    
    const aiPrompt = `The current raw weather data for ${targetCity} is: "${liveRawData}". Take this raw string data and rephrase it into a proper, elegant morning weather report. Mention if an umbrella or proper footwear is required.`;
    
    const message = await queryButlerAI(aiPrompt);
    await say({ text: message, mrkdwn: true });
  } catch (err) {
    console.error("[Weather Command Failure]:", err.message);
  }
});

// 3. /fluffer-iss: Real-time dynamic overhead telemetry tracker
app.command('/fluffer-iss', async ({ command, ack, say }) => {
  await ack();
  try {
    const coords = await getISSPosition();
    const aiPrompt = `The current geographical coordinates of the International Space Station are: ${coords}. Inform the master of this path overhead in a grand, celestial, but butler-appropriate way.`;
    
    const message = await queryButlerAI(aiPrompt);
    await say({ text: message, mrkdwn: true });
  } catch (err) {
    console.error("[ISS Command Failure]:", err.message);
  }
});

/* ==========================================================================
   APP MENTION / FALLBACK CONVERSATION
   ========================================================================== */
app.event('app_mention', async ({ event, say }) => {
  try {
    // Strip out the bot's user tag out of the query string text
    const cleanInput = event.text.replace(/<@.*?>/g, '').trim();
    
    const aiPrompt = `The user has addressed you directly in the parlor channel with the statement: "${cleanInput}". Respond to them directly in your impeccable butler tone.`;
    
    const message = await queryButlerAI(aiPrompt);
    await say({ text: message, mrkdwn: true });
  } catch (err) {
    console.error("[Mention Event Failure]:", err.message);
  }
});

(async () => {
  await app.start();
  console.log('⚡️ Fluffer the AI Butler bot is online and running locally via Ollama!');
})();
