const { App } = require('@slack/bolt');
const Parser = require('rss-parser');
require('dotenv').config();

// Initialize the Bolt App using Socket Mode as per the Hack Club guide
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

const parser = new Parser();
const SATIRE_FEED_URL = 'https://thehardtimes.net';

// Collection of distinguished butler openings
const butlerIntros = [
  "Pardon the interruption, Mum/Sir, but a rather alarming development has surfaced in the tech quarters...",
  "If I may trouble you for a brief moment, my lords, some quite preposterous technology news has arrived...",
  "Forgive my intrusion, but the wireless telegraph is buzzing with this latest piece of electronic gossip...",
  "I have ironed the morning papers for you. This particular tech headline caught my eye, quite dreadful really..."
];

// Helper function to fetch and format the satirical message
async function fetchButlerNews() {
  try {
    const feed = await parser.parseURL(SATIRE_FEED_URL);
    if (!feed.items || feed.items.length === 0) {
      return "Deepest apologies, but the morning news delivery seems to have been delayed.";
    }

    // Pull the latest fake tech headline
    const latestNews = feed.items[0];
    const title = latestNews.title;
    const link = latestNews.link;
    
    const randomIntro = butlerIntros[Math.floor(Math.random() * butlerIntros.length)];

    return `*${randomIntro}*\n\n> *"${title}"*\n\nShould you wish to review the full, absurd chronicle, you may find it here: ${link}\n\nI shall return to polishing the silver.`;
  } catch (error) {
    return "Regrettably, I encountered a severe disturbance while retrieving the daily gazette, Sir.";
  }
}

// Prefix commands with your bot name 'fluffer' to avoid collision on Hack Club Slack
app.command('/fluffer-news', async ({ command, ack, say }) => {
  await ack();
  const message = await fetchButlerNews();
  await say({ text: message, mrkdwn: true });
});

// Also respond when the butler is mentioned directly
app.event('app_mention', async ({ event, say }) => {
  if (event.text.toLowerCase().includes('news')) {
    const message = await fetchButlerNews();
    await say({ text: message, mrkdwn: true });
  } else {
    await say("Yes, Sir? How may I be of service to the channel today?");
  }
});

(async () => {
  await app.start();
  console.log('⚡️ Fluffer the Butler bot is online and serving!');
})();
