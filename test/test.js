const tweetbot = require("../src/app.js");

const cacheURL = process.env.CACHE_URL;
const twitterFakeId = {
  consumer_key: process.env.CONSUMER_KEY+"test",
  consumer_secret_key: process.env.CONSUMER_SECRET_KEY+"test",
  access_token: process.env.ACCESS_TOKEN+"test",
  access_token_secret: process.env.ACCESS_TOKEN_SECRET+"test"
}

const testData = require("./test-data/test.json");
const testProposalsArray = require("./test-data/testProposalsArray.json");
const testProposalsDict = require("./test-data/testProposalsDict.json");
const testTweets = {
  data: [
    {
      text: 'New proposal posted to Genesis: "Lorem\'s ipsum dolor sit amet, consectetur adipiscing elit. Maecenas lacinia urna s… https://t.co/ZIuWtonM6w',
      entities: {
        urls: []
      }
    },
    {
      text: 'Genesis proposal boosted: "test newly boosted proposal with link twer.fasdfaslkj.org/asdf" https://t.co/ZIuWtonM6w',
      entities: {
        urls: [
          {
            url: 'twer.fasdfaslkj.org/asdf',
            display_url: 'https://www.gps.com'
          },
          {
            url: "",
            display_url: "alchemy"
          }
        ]
      }
    },
    {
      text: 'Genesis proposal passed: "test &amp; newly &amp; passed &amp; proposal" https://t.co/ZIuWtonM6w',
      entities: {
        urls: []
      }
    },
    {
      text: 'Genesis proposal passed: "Establishing a norm: for proposals requesting more than 1 ETH, downvote if proposer is no… https://t.co/t37vFEXMqw',
      entities: {
        urls: []
      }
    }
  ]
};

passedCount = 0;
failedCount = 0;

const testTwitterAccount = async () => {
  console.log("twitterAccount should create a twit instance");
  try {
    const twitter = await tweetbot.twitterAccount(twitterFakeId);
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

const testGetProposals = async () => {
  console.log("getProposals should grab a JSON file with proposals that have daoAvatarAddresses.");
  try {
    const cachedProposals = await tweetbot.getProposals(cacheURL);
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

const testTweetableProposals = async () => {
  console.log("tweetableProposals should find untweeted proposals, including edge cases");
  try {
    /*
    takes an array of the texts of tweets of forms like 'Genesis proposal passed:
    "Proposal description"' (make sure to include wacky links, ''&amp;'s, and cutoff
    tweets with '…'s) and a dict of proposals (include regular links, '&'s, and
    too long descriptions)
    */
    const rightNow = Math.floor(Date.now()/1000);
    testProposalsDict[Object.keys(testProposalsDict)[0]].submittedTime = rightNow;
    testProposalsDict[Object.keys(testProposalsDict)[1]].submittedTime = rightNow;
    testProposalsDict[Object.keys(testProposalsDict)[2]].boostedTime = rightNow;
    testProposalsDict[Object.keys(testProposalsDict)[3]].executionTime = rightNow;
    testProposalsDict[Object.keys(testProposalsDict)[4]].executionTime = rightNow;
    testProposalsDict[Object.keys(testProposalsDict)[5]].boostedTime = rightNow;
    const tweets = tweetbot.editTweetURLs(testTweets);
    const tweetableProposals = await tweetbot.tweetableProposals(tweets, testProposalsDict);
    const total = (tweetableProposals.newProposals.length +
                   tweetableProposals.newBoostedProposals.length +
                   tweetableProposals.newPassedProposals.length);
    if(total === 3) {
      console.log("--Passed.");
      passedCount += 1;
    } else {
      console.log("--Failed");
      console.log("Didn't find the correct number of new proposals to tweet.");
      failedCount += 1;
    }
  } catch(err) {
    console.log("--Failed");
    console.log(err);
    failedCount += 1;
  }
}

function mockTwit() {
  let postedTexts = [];
  return {
    post: (text, dict, callback) => {
      postedTexts.push(dict.status)
    },
    getResults: () => {
      return postedTexts
    }
  }
}

const testTweet = async () => {
  console.log("tweet function should try to tweet about all the proposals in the new proposals dict");
  try {
    const twitter = await mockTwit();
    const tweetOutput = await tweetbot.tweet(testProposalsArray,
                              "new", "New proposal posted to Genesis", twitter);
    const results = twitter.getResults();
    if(results[0].slice(0,19) === 'New proposal posted') {
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

// run all tests
const runAllTests = async () => {
  console.log("Running all tests:")
  await testTwitterAccount();
  await testGetProposals();
  await testTweetableProposals();
  await testTweet();
  console.log(`${passedCount} tests passed. ${failedCount} tests failed.`);
  return [passedCount, failedCount];
}

module.exports = { runAllTests }
