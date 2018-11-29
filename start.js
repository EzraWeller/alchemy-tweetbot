const tweetbot = require("./src/app.js");
const testbot = require("./test/test.js");

async function start() {
  const testResults = await testbot.runAllTests();

  if(testResults[0] === 4 && testResults[1] === 0){
    console.log(`Tweetbot starting now, ${new Date}. Interval minutes: ${tweetbot.interval/60000}.`);
    tweetbot.tweetAllNewProposals(tweetbot.url, tweetbot.twit);

    setInterval(() => {
      console.log(`Next round starting now: ${new Date}`);
      tweetbot.tweetAllNewProposals(tweetbot.url, tweetbot.twit);
    }, tweetbot.interval);
  } else {
    console.log(`Tweetbot not starting.`);
  }
}

start();
