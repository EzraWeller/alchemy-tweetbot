const tweetbot = require("./src/app.js");

console.log(`Starting now, ${new Date}`);
tweetbot.tweetAllNewProposals(tweetbot.url, tweetbot.twit);

setInterval(() => {
  console.log(`Next round starting now: ${new Date}`);
  tweetbot.tweetAllNewProposals(tweetbot.url, tweetbot.twit);
}, tweetbot.interval);
