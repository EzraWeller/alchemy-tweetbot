const ArcJs = require("@daostack/arc.js");
const axios = require("axios");
const twit = require("twit");
require("dotenv").config();

const avatarAddress = process.env.AVATAR_ADDRESS; // the avatar address of the DAO
const proposalBaseURL = `https://alchemy.daostack.io/#/dao/${avatarAddress}/proposal/`;
const apiURL = "https://daostack-alchemy.herokuapp.com";
const tweetInterval = 15 /* minutes */ * 60000 /* miliseconds/minute */

// create twit instance
const twitterAccount = new twit({
  consumer_key:        process.env.CONSUMER_KEY,
  consumer_secret:     process.env.CONSUMER_SECRET_KEY,
  access_token:        process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  timeout_ms:          60 * 1000
})

// function for grabbing recent proposals
const newProposals = async (daoAddress) => {
  const cutoffTime = Math.floor(Date.now()/1000) - Math.floor(tweetInterval/1000);

  console.log("getting server proposals");
  const filter = `{"where":{"daoAvatarAddress":"${daoAddress}"}}`;
  const allProposals = await axios.get(`${apiURL}/api/proposals?filter=${filter}`);

  console.log(`getting proposals submitted in the last ${tweetInterval/60000} minutes`);
  const proposalsNewToOld = allProposals.data.slice(0).reverse()
  const results = [];
  proposalsNewToOld.forEach((val) => {
    if(val.submittedAt < cutoffTime) {
      return
    }
    results.unshift(val);
  });
  console.log(results);
  return results;
}

// function to grab and tweet each recent proposal in chronological order
const tweetNewProposals = async (daoAddress, twitInstance) => {
  try {
    const proposalsToTweet = await newProposals(daoAddress);
    if(proposalsToTweet.length === 0) {
      console.log(`no new proposals in the last ${tweetInterval/60000} minutes`);
      return
    }
    console.log("tweeting recent proposals")
    proposalsToTweet.forEach((val) => {
      const proposalURL = proposalBaseURL + val.arcId;
      twitInstance.post('statuses/update',
        {
          status: 'New proposal posted to Genesis: "' + val.title + '" ' + proposalURL
        },
        (err, data, res) => { console.log("Tweet posted at: " + data.created_at) }
      );
    });
  } catch (err) {
    console.log(err);
  }
}

// run tweetNewProposals at frequency == tweetInterval
setInterval(() => {
    console.log(`next round starting now: ${new Date}`);
    tweetNewProposals(avatarAddress, twitterAccount);
}, tweetInterval);
