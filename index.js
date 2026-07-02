const { App } = require('@slack/bolt');
require('dotenv').config();

// Initialize the Bolt App using Socket Mode as configured in your Hack Club deployment
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Using an automated public proxy gateway to ensure stable delivery past Cloudflare
const SATIRE_FEED_URL = 'https://rss2json.com';

// Collection of distinguished butler openings
const butlerIntros = [
  "Pardon the interruption, Mum/Sir, but a rather alarming development has surfaced in the tech quarters...",
  "If I may trouble you for a brief moment, my lords, some quite preposterous technology news has arrived...",
  "Forgive my intrusion, but the wireless telegraph is buzzing with this latest piece of electronic gossip...",
  "I have ironed the morning papers for you. This particular tech headline caught my eye, quite dreadful really..."
];

// Helper function to fetch and safely parse the satirical news
async function fetchButlerNews() {
  try {
    // Node.js native fetch handles the API gateway cleanly
    const response = await fetch(SATIRE_FEED_URL);
    
    if (!response.ok) {
      throw new Error(`Gateway returned HTTP status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return "Deepest apologies, but the morning news delivery seems to have been delayed, Sir.";
    }

    // Pull the latest fake tech headline from the JSON dataset array
    const latestNews = data.items[0];
    const title = latestNews.title;
    const link = latestNews.link;
    
    const randomIntro = butlerIntros[Math.floor(Math.random() * butlerIntros.length)];

    return `*${randomIntro}*\n\n> *"${title}"*\n\nShould you wish to review the full, absurd chronicle, you may find it here: ${link}\n\nI shall return to polishing the silver.`;
  } catch (error) {
    console.error("[Butler Error Log]:", error.message);
    return `Regrettably, I encountered a severe disturbance while retrieving the daily gazette, Sir. (Reason: ${error.message})`;
  }
}

// Prefix command structure matching your 'fluffer' app configuration setup
app.command('/fluffer-news', async ({ command, ack, say }) => {
  await ack();
  try {
    const message = await fetchButlerNews();
    await say({ text: message, mrkdwn: true });
  } catch (err) {
    console.error("[Slash Command Failure]:", err.message);
  }
});

// Fallback direct mention configuration handling channel pings
app.event('app_mention', async ({ event, say }) => {
  try {
    if (event.text.toLowerCase().includes('news')) {
      const message = await fetchButlerNews();
      await say({ text: message, mrkdwn: true });
    } else {
      await say("Yes, Sir? How may I be of service to the channel today?");
    }
  } catch (err) {
    console.error("[Mention Event Failure]:", err.message);
  }
});

(async () => {
  await app.start();
  console.log('⚡️ Fluffer the Butler bot is online and serving!');
})();
