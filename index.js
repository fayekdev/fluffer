const { App } = require('@slack/bolt');
require('dotenv').config();

// Initialize the Bolt App via Socket Mode using your Hack Club credentials
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Distinguished butler greetings and intros
const butlerIntros = [
  "Pardon the interruption, Mum/Sir, but a rather alarming development has surfaced in the tech quarters...",
  "If I may trouble you for a brief moment, my lords, some quite preposterous technology news has arrived...",
  "Forgive my intrusion, but the wireless telegraph is buzzing with this latest piece of electronic gossip...",
  "I have ironed the morning papers for you. This particular tech headline caught my eye, quite dreadful really...",
  "Forgive me, Sir, but it appears the engineers have lost their minds once again..."
];

// Completely offline database of highly exaggerated tech satire headlines
const satiricalHeadlines = [
  { title: "Apple Announces New 'Apple Glass' Subscription Plan Charging $4.99 Per Blink", link: "https://thehardtimes.net" },
  { title: "AI Startup Launches App That Converts Venture Capital Directly Into Carbon Dioxide", link: "https://thehardtimes.net" },
  { title: "Linus Torvalds Deletes Linux Kernel Following Minor Typo Argument on Mailing List", link: "https://thehardtimes.net" },
  { title: "Mark Zuckerberg Updates Terms of Service to Claim Legal Ownership Over Your Childhood Memories", link: "https://thehardtimes.net" },
  { title: "New Gaming Mouse Features Injected Caffeine Port Directly Into User's Palm", link: "https://thehardtimes.net" },
  { title: "Data Center Cooling System Swapped with Liquid Mountain Dew Following Budget Cuts", link: "https://thehardtimes.net" },
  { title: "Software Engineer Successfully Automates Own Job, Spends Next 4 Years Playing Old School RuneScape", link: "https://thehardtimes.net" },
  { title: "Cryptocurrency Startup Pivots to Simply Asking Passersby If They Have Any Spare Quarters", link: "https://thehardtimes.net" },
  { title: "Microsoft Windows Update Installs Windows 12 Without Permission, Uninstalls User's Linoleum Floor", link: "https://thehardtimes.net" },
  { title: "GitHub Copilot Refuses to Auto-Complete Code Until Developer Says 'Please'", link: "https://thehardtimes.net" },
  { title: "Local Tech Bro Unironically Refers to Hot Pocket Machine Optimization as 'The Stack'", link: "https://thehardtimes.net" }
];

// Local execution block to handle the butler persona formatting
function generateButlerSatire() {
  try {
    const randomIntro = butlerIntros[Math.floor(Math.random() * butlerIntros.length)];
    const randomNews = satiricalHeadlines[Math.floor(Math.random() * satiricalHeadlines.length)];

    return `*${randomIntro}*\n\n> *"${randomNews.title}"*\n\nShould you wish to review the full, absurd chronicle, you may find it here: ${randomNews.link}\n\nI shall return to polishing the silver, Sir.`;
  } catch (error) {
    console.error("[Butler Local Generation Error]:", error.message);
    return "Regrettably, I encountered a disturbance while organizing the morning papers, Sir.";
  }
}

// Slash command structure matching your 'fluffer' app configuration setup
app.command('/fluffer-news', async ({ command, ack, say }) => {
  await ack();
  try {
    const message = generateButlerSatire();
    await say({ text: message, mrkdwn: true });
  } catch (err) {
    console.error("[Slash Command Failure]:", err.message);
  }
});

// Fallback direct mention configuration handling channel pings
app.event('app_mention', async ({ event, say }) => {
  try {
    if (event.text.toLowerCase().includes('news')) {
      const message = generateButlerSatire();
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
  console.log('⚡️ Fluffer the Butler bot is online and serving local news!');
})();
