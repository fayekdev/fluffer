require ("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});


app.command("/fluffer-ping", async({command, ack, respond}) =>{
    const start =Date.now();
    await ack();
    const latency = Date.now() - start;
    await respond(`Fluffer is online! Latency: ${latency}ms`);
});

(async () => {
    await app.start();
    console.log("Fluffer is running!");
})();