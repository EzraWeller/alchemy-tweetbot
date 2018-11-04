const tweetbot = require("../src/app.js");

const cacheURL = process.env.CACHE_URL;
const twitterFakeId = {
  consumer_key: process.env.CONSUMER_KEY+"test",
  consumer_secret_key: process.env.CONSUMER_SECRET_KEY+"test",
  access_token: process.env.ACCESS_TOKEN+"test",
  access_token_secret: process.env.ACCESS_TOKEN_SECRET+"test"
}

const testData = require("./test-data/test.json");
const testProposals = require("./test-data/test-proposals.json");

passedCount = 0;
failedCount = 0;

const testTwitInstance = async () => {
  console.log("twitterAccount should create a twit instance");
  try {
    const twitter = await tweetbot.twitInstance(twitterFakeId);
    if(twitter.config.consumer_key) {
      console.log("--Passed.");
      passedCount += 1;
    } else {
      console.log("--Failed");
      console.log("Twit instance not properly created.");
      failedCount += 1;
    }
  } catch(err) {
    console.log("--Failed");
    console.log(err);
    failedCount += 1;
  }
}

const testGetDataCache = async () => {
  console.log("getProposals should grab a JSON file with proposals that have daoAvatarAddresses.");
  try {
    const cachedProposals = await tweetbot.getDataCache(cacheURL);
    if(cachedProposals[Object.keys(cachedProposals)[0]].daoAvatarAddress) {
      console.log("--Passed.");
      passedCount += 1;
    } else {
      console.log("--Failed");
      console.log("Improper data found.");
      failedCount += 1;
    }
  } catch(err) {
    console.log("--Failed");
    console.log(err);
    failedCount += 1;
  }
}

const testNewProposals = async () => {
  console.log("newProposals should grab only proposals with proper times and output a dict with correct keys.");
  try {
    const testCache = testData.data.proposals;
    testProposals[0].submittedTime = Math.floor(Date.now()/1000);
    testProposals[1].boostedTime = Math.floor(Date.now()/1000);
    testProposals[2].executionTime = Math.floor(Date.now()/1000);
    testCache["0x3f50f3b6b275ba4ba7179ec62f1c072079909c44809c916c3a09304d0b60000"] = testProposals[0];
    testCache["0x3f50f3b6b275ba4ba7179ec62f1c072079909c44809c916c3a09304d0b00000"] = testProposals[1];
    testCache["0x3f50f3b6b275ba4ba7179ec62f1c072079909c44809c916c3a09304d0000000"] = testProposals[2];
    const proposalDict = await tweetbot.filterNewProposals(testCache);
    if (proposalDict.newProposals.length > 0) {
      console.log("--Passed.");
      passedCount += 1;
    } else {
      console.log("--Failed")
      console.log("New proposals failed to be found.");
      failedCount += 1;
    }
  } catch(err) {
    console.log("--Failed");
    console.log(err);
    failedCount += 1;
  }
}

// not sure how to test this
/*
const testTweet = async () => {
  console.log("tweet function should try to tweet about all the proposals in the new proposals dict");
  try {
    const twitter = await tweetbot.twitInstance(twitterFakeId);
    const testCache = testData.data.proposals;
    testProposals[0].submittedTime = Math.floor(Date.now()/1000);
    testCache["0x3f50f3b6b275ba4ba7179ec62f1c072079909c44809c916c3a09304d0b60000"] = testProposals[0];
    const proposalsToTweet = await tweetbot.filterNewProposals(testCache);
    const tweetOutput = await tweetbot.tweetProposalSet(proposalsToTweet.newProposals,
                              "new", "New proposal posted to Genesis", twitter);
    if(true) {
      console.log("--Passed.");
      passedCount += 1;
    } else {
      console.log("--Failed")
      console.log("New proposals failed to be found.");
      failedCount += 1;
    }
  } catch(err) {
    console.log("--Failed");
    console.log(err);
    failedCount += 1;
  }
}
*/

// run all tests
const runAllTests = async () => {
  console.log("Running all tests:")
  await testTwitInstance();
  await testGetDataCache();
  await testNewProposals();
  console.log(`${passedCount} tests passed. ${failedCount} tests failed.`);
}

runAllTests();
