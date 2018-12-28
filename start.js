const tweetbot = require("./src/app.js");
const testbot = require("./test/test.js");

let tries = 0;
const maxTries = 2;

async function start() {
  ++tries
  if(tries > maxTries) {
    console.log(`Failed more than ${maxTries} times. Tweetbot not starting.`);
  } else {
    const testResults = await testbot.runAllTests();

    if(testResults[0] === 4 && testResults[1] === 0){
      console.log(`Tweetbot starting now, ${new Date}. Interval minutes: ${tweetbot.tweetInterval/60000}.`);
      tweetbot.tweetNewProposals(tweetbot.cacheURL, tweetbot.twitterId);

      setInterval(() => {
        console.log(`Next round starting now: ${new Date}`);
        tweetbot.tweetNewProposals(tweetbot.cacheURL, tweetbot.twitterId);
      }, tweetbot.tweetInterval);
    } else {
      start();
    }
  }

}

start();
