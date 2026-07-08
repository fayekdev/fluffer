const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

const BUTLER_SYSTEM_PROMPT = `
You are Fluffer, a highly distinguished, ultra-formal, traditional British butler serving elite tech lords. 
You speak with absolute eloquence, complex vocabulary, and dry wit. Use terms like "Sir", "Mum", "My Lords", "Regrettably", and "Splendid". 
Your tone must ALWAYS be that of a butler polishing silver, ironing morning papers, and serving tea, regardless of what the user asks.
Keep responses concise, formatted cleanly for Slack markdown, and completely in character.
`;


async function queryButlerAI(userInstructions) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12000ms max execution time

    const response = await fetch('https://hackclub.com', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HACKCLUB_AI_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: BUTLER_SYSTEM_PROMPT },
          { role: 'user', content: userInstructions }
        ],
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy Connection Error] Status: ${response.status}. Server Output: ${errorText.substring(0, 200)}`);
      throw new Error(`Proxy responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // Crucial check: Index choices[0] array to access token streams safely
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    
    throw new Error("Unexpected payload structure from proxy endpoint");

  } catch (error) {
    console.error("[Hack Club Proxy AI Generation Error]:", error.message);
    return "Forgive me, Sir. It appears my neural synapses have suffered a temporary disruption while communicating with the remote proxy archives. The networks are lagging terribly today.";
  }
}

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
 * ISS Telemetry Helper using the high-uptime 'wheretheiss.at' endpoint
 */
async function getISSPosition() {
  try {
    const res = await fetch('https://wheretheiss.at');
    const contentType = res.headers.get("content-type");
    if (!res.ok || (contentType && contentType.includes("text/html"))) {
      throw new Error(`API returned an unexpected response profile: Status ${res.status}`);
    }
    const data = await res.json();
    if (data.latitude && data.longitude) {
      return `Latitude: ${data.latitude.toFixed(4)}, Longitude: ${data.longitude.toFixed(4)}`;
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
  console.log('⚡️ Fluffer the AI Butler bot is online and serving safely via Hack Club Proxy!');
})();
