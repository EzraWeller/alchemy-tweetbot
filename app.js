const axios = require("axios");
const twit = require("twit");
require("dotenv").config();

const avatarAddress = process.env.AVATAR_ADDRESS; // the avatar address of the DAO
const proposalBaseURL = `https://alchemy.daostack.io/#/dao/${avatarAddress}/proposal/`;
const cacheURL = "https://s3-us-west-2.amazonaws.com/daostack-alchemy-staging/initialArcState-live.json";
const providerUrl = 'https://mainnet.infura.io/v3/'+process.env.INFURA_KEY;
const tweetInterval = 10 /* minutes */ * 60000; /* miliseconds per minute */

// testing
const testData = require("./test-data/test.json");
const testCache = testData.proposals;
const testEnv = process.env.TEST;
const testProposals = require("./test-data/test-proposals.json");

// create twit instance
const twitterAccount = new twit({
  consumer_key:        process.env.CONSUMER_KEY,
  consumer_secret:     process.env.CONSUMER_SECRET_KEY,
  access_token:        process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  timeout_ms:          60 * 1000
});

// function for grabbing recent proposals
const newProposals = async (daoAddress) => {
  const cutoffTime = Math.floor(Date.now()/1000) - Math.floor(tweetInterval/1000);

  console.log("getting server proposals");
  if(testEnv === "true") {
    console.log("CURRENTLY IN TEST ENV.");
    allProposals = testCache;
  } else {
    response = await axios.get(cacheURL);
    allProposals = response.data.proposals;
  }

  console.log(`getting proposals submitted in the last ${tweetInterval/60000} minutes`);
  const proposalsNewToOld = Object.values(allProposals).slice(0).reverse()
  const newProposals = [];
  const newBoostedProposals = [];
  const newPassedProposals = [];
  proposalsNewToOld.some((val) => {
    if(val.executionTime >= cutoffTime) {
      newPassedProposals.unshift(val);
    } else if(val.boostedTime >= cutoffTime) {
      newBoostedProposals.unshift(val);
    } else if(val.submittedTime >= cutoffTime) {
      newProposals.unshift(val);
    } else {
      // console.log(val.submittedTime);
      console.log(val.submittedTime+' is less than the cut off: '+cutoffTime);
      return val.submittedTime < cutoffTime;
    }
  });
  const results = {
    "newProposals": newProposals,
    "newBoostedProposals": newBoostedProposals,
    "newPassedProposals": newPassedProposals
  }
  console.log(results);
  return results;
}

// function to grab and tweet each recent proposal in chronological order
const tweetNewProposals = async (daoAddress, twitInstance) => {
  try {
    const proposalsToTweet = await newProposals(daoAddress);
    if(proposalsToTweet.newProposals.length === 0 &&
        proposalsToTweet.newBoostedProposals.length === 0 &&
        proposalsToTweet.newPassedProposals.length === 0) {
      console.log(`no new, newly boosted, or newly passed proposals in the last ${tweetInterval/60000} minutes`);
      return
    }
    if(testEnv) {
      console.log("tweeting recent proposals")
      proposalsToTweet.newProposals.forEach((val) => {
        const proposalURL = proposalBaseURL + val.proposalId;
        twitInstance.post('statuses/update',
          {
            status: `New proposal posted to Genesis: "${val.title}" ${proposalURL}`
          },
          (err, data, res) => {
            if(err) {
              console.log("Error: "+err.message)
              // try again right away to catch missed proposals
              tweetNewProposals(daoAddress, twitInstance);
            } else {
              console.log(`Tweet posted at: ${data.created_at}`)
            }
          }
        );
      });
      proposalsToTweet.newBoostedProposals.forEach((val) => {
        const proposalURL = proposalBaseURL + val.proposalId;
        twitInstance.post('statuses/update',
          {
            status: `Genesis proposal boosted: "${val.title}" ${proposalURL}`
          },
          (err, data, res) => {
            if(err) {
              console.log("Error: "+err.message)
              // try again right away to catch missed proposals
              tweetNewProposals(daoAddress, twitInstance);
            } else {
              console.log(`Tweet posted at: ${data.created_at}`)
            }
          }
        );
      });
      proposalsToTweet.newPassedProposals.forEach((val) => {
        const proposalURL = proposalBaseURL + val.proposalId;
        twitInstance.post('statuses/update',
          {
            status: `Genesis proposal passed: "${val.title}" ${proposalURL}`
          },
          (err, data, res) => {
            if(err) {
              console.log("Error: "+err.message)
              // try again right away to catch missed proposals
              tweetNewProposals(daoAddress, twitInstance);
            } else {
              console.log(`Tweet posted at: ${data.created_at}`)
            }
          }
        );
      });
    }
  } catch (err) {
    console.log(err);
    // try again right away to catch missed proposals
    tweetNewProposals(daoAddress, twitInstance);
  }
}

// add some fake new proposals if testing
if(testEnv === "true") {
  setTimeout(() => {
    testProposals[0].submittedTime = Math.floor(Date.now()/1000);
    testProposals[1].boostedTime = Math.floor(Date.now()/1000);
    testProposals[2].executionTime = Math.floor(Date.now()/1000);
    testCache["0x3f50f3b6b275ba4ba7179ec62f1c072079909c44809c916c3a09304d0b60000"] = testProposals[0];
    testCache["0x3f50f3b6b275ba4ba7179ec62f1c072079909c44809c916c3a09304d0b00000"] = testProposals[1];
    testCache["0x3f50f3b6b275ba4ba7179ec62f1c072079909c44809c916c3a09304d0000000"] = testProposals[2];
  }, tweetInterval*1.9)
}

// run tweetNewProposals at frequency == tweetInterval
tweetNewProposals(avatarAddress, twitterAccount);
setInterval(() => {
  console.log(`next round starting now: ${new Date}`);
  tweetNewProposals(avatarAddress, twitterAccount);
}, tweetInterval);
