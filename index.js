import pkg from '@slack/bolt';
const { App } = pkg;
import { OpenRouter } from '@openrouter/sdk';
import 'dotenv/config';

// 1. Initialize Slack App (Switched to HTTP Receiver to bypass local network blocks)
const slackToken = process.env.SLACK_BOT_TOKEN;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackAppToken = process.env.SLACK_APP_TOKEN; // for Socket Mode

if (!slackSigningSecret && !slackAppToken) {
  console.error('Missing Slack configuration. Set SLACK_SIGNING_SECRET or SLACK_APP_TOKEN.');
  process.exit(1);
}

const app = new App({
  token: slackToken,
  signingSecret: slackSigningSecret || undefined,
  appToken: slackAppToken || undefined,
  socketMode: Boolean(slackAppToken),
});

// 2. Initialize the OpenRouter SDK Client pointed to Hack Club's Proxy
const aiClient = new OpenRouter({
  apiKey: process.env.HACKCLUB_API_KEY,
  serverURL: "https://ai.hackclub.com/proxy/v1",
});

const BUTLER_SYSTEM_PROMPT = `
You are Fluffer, a highly distinguished, ultra-formal, traditional British butler serving elite tech lords. 
You speak with absolute eloquence, complex vocabulary, and dry wit. Use terms like "Sir", "Mum", "My Lords", "Regrettably", and "Splendid". 
Your tone must ALWAYS be that of a butler polishing silver, ironing morning papers, and serving tea, regardless of what the user asks.
Keep responses concise, formatted cleanly for Slack markdown, and completely in character.
`;

/**
 * Executes AI generation requests via the implemented OpenRouter SDK configuration
 */
async function queryButlerAI(userInstructions) {
  try {
    const response = await aiClient.chat.send({
      chatRequest: {
        model: "qwen/qwen3-32b",
        messages: [
          { role: "system", content: BUTLER_SYSTEM_PROMPT },
          { role: "user", content: userInstructions }
        ],
        stream: false,
        temperature: 0.7
      }
    });

    // Safely verify and extract data using the OpenRouter flattened choices schema
    // response.choices is commonly an array; handle multiple possible shapes
    if (response && response.choices) {
      // choice could be array with .message.content
      const first = Array.isArray(response.choices) ? response.choices[0] : response.choices;
      if (first && first.message && first.message.content) return first.message.content;
      // fallback: some SDKs return an "output" or flattened fields
      if (response.output?.[0]?.content) return response.output[0].content;
    }
    
    throw new Error("Unexpected payload structure returned from the SDK schema model");

  } catch (error) {
    console.error("[OpenRouter SDK AI Generation Error]:", error.message);
    return "Forgive me, Sir. It appears my neural synapses have suffered a temporary disruption while communicating with the remote proxy archives. The networks are lagging terribly today.";
  }
}

/**
 * Weather Engine using raw wttr.in payload streams
 */
async function getLiveWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+with+winds+at+%w`);
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
 * ISS Telemetry Helper using the high-uptime 'wheretheiss.at' JSON endpoint
 */
async function getISSPosition() {
  try {
    const res = await fetch('https://api.wheretheiss.at/satellites/25544');
    const contentType = res.headers.get("content-type");
    if (!res.ok || (contentType && contentType.includes("text/html"))) {
      throw new Error(`API returned an unexpected response profile: Status ${res.status}`);
    }
    const data = await res.json();
    if (data.latitude && data.longitude) {
      return `Latitude: ${data.latitude.toFixed(4)}°, Longitude: ${data.longitude.toFixed(4)}°, Altitude: ${parseFloat(data.altitude).toFixed(2)} km, Velocity: ${parseFloat(data.velocity).toFixed(2)} km/h`;
    }
    throw new Error("Invalid payload structure from coordinate telemetry");
  } catch (err) {
    console.error("[ISS Fetch Fail]:", err.message);
    return "unknown coordinates hidden entirely by atmospheric interference";
  }
}

/* ==========================================================================
   SLACK COMMANDS & EVENTS
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
    const aiPrompt = `The current geographical coordinates and telemetry metrics of the International Space Station are: ${coords}. Inform the master of this celestial path overhead in a grand, but butler-appropriate way. Mention its staggering velocity.`;
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

// Start the HTTP server on Port 3000 (standard for cloud host event routing)
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`Fluffer the AI Butler is online! Listening on web server port ${port}`);
})();
