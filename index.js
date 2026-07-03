const { App } = require('@slack/bolt');
const ollama = require('ollama').default;
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Fixed Master Butler System Prompt
const BUTLER_SYSTEM_PROMPT = `
You are Fluffer, a highly distinguished, ultra-formal, traditional British butler serving elite tech lords. 
You speak with absolute eloquence, complex vocabulary, and dry wit. Use terms like "Sir", "Mum", "My Lords", "Regrettably", and "Splendid". 
Your tone must ALWAYS be that of a butler polishing silver, ironing morning papers, and serving tea, regardless of what the user asks.
Keep responses concise, formatted cleanly for Slack markdown, and completely in character.
`;

/**
 * AI Query Helper with a strict 4-second cutoff to protect the Slack socket
 */
async function queryButlerAI(userInstructions) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4000ms max execution time

    const response = await ollama.chat({
      model: 'llama3',
      messages: [
        { role: 'system', content: BUTLER_SYSTEM_PROMPT },
        { role: 'user', content: userInstructions }
      ],
      options: { temperature: 0.7 }
    }, { signal: controller.signal });

    clearTimeout(timeoutId);
    return response.message.content;
  } catch (error) {
    console.error("[Ollama AI Generation Error]:", error.message);
    return "Forgive me, Sir. It appears my neural synapses have suffered a temporary disruption while crafting my response. The archives are lagging terribly today.";
  }
}

/**
 * Weather Helper with HTML Response Protection
 */
async function getLiveWeather(city) {
  try {
    const res = await fetch(`https://wttr.in{encodeURIComponent(city)}?format=%C+%t+with+winds+at+%w`);
    const contentType = res.headers.get("content-type");
    if (!res.ok || (contentType && contentType.includes("text/html"))) {
      throw new Error("API returned raw HTML code instead of weather parameters");
    }
    return await res.text();
  } catch (err) {
    console.error("[Weather Fetch Fail]:", err.message);
    return "overcast and thoroughly uninviting, with a high chance of structural dampness";
  }
}

/**
 * ISS Telemetry Helper with HTML Response Protection
 */
async function getISSPosition() {
  try {
    const res = await fetch('http://open-notify.org');
    const contentType = res.headers.get("content-type");
    if (!res.ok || (contentType && contentType.includes("text/html"))) {
      throw new Error("API returned raw HTML code instead of json telemetry");
    }
    const data = await res.json();
    if (data.message === "success" && data.iss_position) {
      return `Latitude: ${data.iss_position.latitude}, Longitude: ${data.iss_position.longitude}`;
    }
    throw new Error("Invalid payload structure");
  } catch (err) {
    console.error("[ISS Fetch Fail]:", err.message);
    return "unknown coordinates hidden entirely by atmospheric interference";
  }
}

/* ==========================================================================
   SLACK COMMANDS
   ========================================================================== */

// 1. /fluffer-news
app.command('/fluffer-news', async ({ command, ack, say }) => {
  await ack();
  try {
    const aiPrompt = "Generate one completely absurd, highly exaggerated, fictional technology headline. Followed by a witty, butler-style dry remark about it.";
    const message = await queryButlerAI(aiPrompt);
    await say({ text: message, mrkdwn: true });
  } catch (err) {
    console.error("[Slash News Command Failure]:", err.message);
  }
});

// 2. /fluffer-weather
app.command('/fluffer-weather', async ({ command, ack, say }) => {
  await ack();
  try {
    const targetCity = command.text.trim() || "London";
    const liveRawData = await getLiveWeather(targetCity);
    const aiPrompt = `The current raw weather data for ${targetCity} is: "${liveRawData}". Take this raw data string and rephrase it into an elegant morning weather report. Mention if an umbrella or proper footwear is required.`;
    const message = await queryButlerAI(aiPrompt);
    await say({ text: message, mrkdwn: true });
  } catch (err) {
    console.error("[Slash Weather Command Failure]:", err.message);
  }
});

// 3. /fluffer-iss
app.command('/fluffer-iss', async ({ command, ack, say }) => {
  await ack();
  try {
    const coords = await getISSPosition();
    const aiPrompt = `The current geographical coordinates of the International Space Station are: ${coords}. Inform the master of this celestial path overhead in a grand, but butler-appropriate way.`;
    const message = await queryButlerAI(aiPrompt);
    await say({ text: message, mrkdwn: true });
  } catch (err) {
    console.error("[Slash ISS Command Failure]:", err.message);
  }
});

// 4. Fallback Channel Mentions
app.event('app_mention', async ({ event, say }) => {
  try {
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
  console.log('⚡️ Fluffer the AI Butler bot is online and serving safely!');
})();
