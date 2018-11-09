const axios = require("axios");
const twit = require("twit");
require("dotenv").config();

const avatarAddress = process.env.AVATAR_ADDRESS; // the avatar address of the DAO
const cacheURL = process.env.CACHE_URL;
const proposalBaseURL = `https://alchemy.daostack.io/#/dao/${avatarAddress}/proposal/`;
const tweetInterval = process.env.MINUTES /* minutes */ * 60000; /* miliseconds per minute */
const twitterId = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret_key: process.env.CONSUMER_SECRET_KEY,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
}

// function to create twit instance
const twitterAccount = (dict) => {
  const output = new twit({
    consumer_key:        dict.consumer_key,
    consumer_secret:     dict.consumer_secret_key,
    access_token:        dict.access_token,
    access_token_secret: dict.access_token_secret,
    timeout_ms:          60 * 1000
  });
  return output;
}

// function for grabbing the cache of DAO data
const getProposals = async (url) => {
  console.log("getting server proposals");
  response = await axios.get(url);
  return response.data.proposals;
}

// function for grabbing recent proposals from the cache
const newProposals = async (proposals) => {
  const cutoffTime = Math.floor(Date.now()/1000) - Math.floor(tweetInterval/1000);

  console.log(`getting proposals submitted in the last ${tweetInterval/60000} minutes`);
  const proposalsNewToOld = Object.values(proposals).slice(0).reverse()
  var count = 0;
  const newProposals = [];
  const newBoostedProposals = [];
  const newPassedProposals = [];
  proposalsNewToOld.some((val) => {
    if(val.executionTime >= cutoffTime) {
      console.log("newly passed proposal found.");
      newPassedProposals.unshift(val);
      count++;
    } else if(val.boostedTime >= cutoffTime) {
      console.log("newly boosted proposal found.");
      newBoostedProposals.unshift(val);
      count++;
    } else if(val.submittedTime >= cutoffTime) {
      console.log("new proposal found.");
      newProposals.unshift(val);
      count++;
    } else {
      if(count > 0) { console.log("PROPOSALS-FOUND-MARKER") }
      console.log(`${count} new proposals found in the last ${tweetInterval/60000} minutes`);
      return val.submittedTime < cutoffTime;
    }
  });
  const results = {
    "newProposals": newProposals,
    "newBoostedProposals": newBoostedProposals,
    "newPassedProposals": newPassedProposals
  }
  return results;
}

// function to tweet specific set of proposals
const tweet = async (proposalsArray, proposalTypeString, tweetString, twitInstance) => {
  console.log(`tweeting ${proposalTypeString} proposals`);
  proposalsArray.forEach((val) => {
    const proposalURL = proposalBaseURL + val.proposalId;
    twitInstance.post('statuses/update',
      {
        status: `${tweetString}: "${val.title}" ${proposalURL}`
      },
      (err, data, res) => {
        if(err) {
          console.log("Error: "+err.message)
        } else {
          console.log(`Tweet posted at: ${data.created_at}`)
        }
      }
    );
  });
}

// full function to grab and tweet each recent proposal in chronological order
const tweetNewProposals = async (dataURL, twitterDict) => {
  try {
    // grab all data, then select new proposals
    const twitInstance = await twitterAccount(twitterDict);
    const proposals = await getProposals(dataURL);
    const proposalsToTweet = await newProposals(proposals);

    // if no tweetable proposals are found, stop
    if(proposalsToTweet.newProposals.length === 0 &&
        proposalsToTweet.newBoostedProposals.length === 0 &&
        proposalsToTweet.newPassedProposals.length === 0) {
      return
    }

    // tweet new proposals of all three types
    console.log("Proposals to tweet:", proposalsToTweet);
    if(proposalsToTweet.newProposals.length > 0) {
      await tweet(proposalsToTweet.newProposals, "new", "New proposal posted to Genesis", twitInstance);
    }
    if(proposalsToTweet.newBoostedProposals.length > 0) {
      await tweet(proposalsToTweet.newBoostedProposals, "boosted", "Genesis proposal boosted", twitInstance);
    }
    if(proposalsToTweet.newPassedProposals.length > 0) {
      await tweet(proposalsToTweet.newPassedProposals, "passed", "Genesis proposal passed", twitInstance);
    }
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  twitInstance: twitterAccount,
  getDataCache: getProposals,
  filterNewProposals: newProposals,
  tweetProposalSet: tweet,
  tweetAllNewProposals: tweetNewProposals,
  twit: twitterId,
  url: cacheURL,
  interval: tweetInterval
}
