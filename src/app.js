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
  const response = await axios.get(url);
  return response.data.proposals;
}

// function to grab all tweets from the twitter account
const getTweets = async (twitterDict) => {
  console.log("getting already tweeted tweets");
  const tweets = [];
  const response = await twitterDict.get('statuses/user_timeline',
    { id_str: '1043553688424452097', count: 200 });
    /*
    NOTE: Not sure what this will do when there are > 200 tweets, and
    if the DAO is ever producing >200 proposals per 3 day period, this
    function will probably need to be adjusted to grab more tweets
    (run the function more than once, stop if it grabs less than 200 tweets?).
    */
  response.data.forEach((tweet) => {
    // maybe get rid of very old tweets ? (> 1 week?)
    tweets.push(tweet.text.slice(0, -24));
  });
  return tweets;
}

// check if query is in array
function findMatch(query, array) {
  let matchFound = false;
  array.forEach((item) => {
    if(query === item) {
      matchFound = true;
    }
    // if not a match, compare word by word, allowing 1 mismatch
    if(matchFound === false) {
      let queryA = query.split(' ');
      let itemA = item.split(' ');
      let mismatches = {};
      let wordIndex = 0;
      queryA.forEach((qWord) => {
        if(qWord !== itemA[wordIndex]) {
          mismatches[qWord] = itemA[wordIndex];
        }
        ++wordIndex;
      })
      if(Object.keys(mismatches).length <= 1 &&
      mismatches['boosted:'] !== 'passed:' &&
      mismatches['passed:'] !== 'boosted:') {
        matchFound = true;
      }
    }
  });
  return matchFound;
}

// function to find proposals that haven't yet been tweeted about
const tweetableProposals = (tweets, proposals) => {
  // replace ampersands
  function removeOddChars(string) {
    let noAmps = string.replace(/&(?!amp;)/g, '&amp;');
    // noOddChars = noAmps.replace(/'/g, "\'");
    return noAmps;
  }
  console.log("finding untweeted proposals");
  const proposalsToTweet = {newProposals: [], newBoostedProposals: [], newPassedProposals: []};
  Object.keys(proposals).forEach((proposalId) => {
    if(proposals[proposalId].executionTime === 0 && // check for proposals not boosted or passed
      proposals[proposalId].boostedTime === 0 && // and submitted in the past 3 weeks
      proposals[proposalId].submittedTime > (Math.floor(Date.now()/1000)-18144e2)) {
          let nTweet = `New proposal posted to Genesis: "${proposals[proposalId].title}"`;
          if(nTweet.length > 115) { nTweet = nTweet.slice(0,115)+"…"}
          nTweet = removeOddChars(nTweet);

          if(proposals[proposalId].submittedTime + // check for expired regular proposals
             proposals[proposalId].preBoostedVotePeriodLimit <
             Math.floor(Date.now()/1000)) {
          // skip it
          } else if(findMatch(nTweet, tweets) === false) {
            proposalsToTweet.newProposals.push(proposals[proposalId]);
          }

    } else if(proposals[proposalId].executionTime === 0 && // check for boosted proposals not passed
      proposals[proposalId].boostedTime > 0) {
          let bTweet = `Genesis proposal boosted: "${proposals[proposalId].title}"`;
          if(bTweet.length > 115) { bTweet = bTweet.slice(0,115)+"…"}
          bTweet = removeOddChars(bTweet);
          if(proposals[proposalId].boostedTime + // check for expired boosted proposals
             proposals[proposalId].boostedVotePeriodLimit <
             Math.floor(Date.now()/1000)) {
            // skip it
          } else if(findMatch(bTweet, tweets) === false) {
            proposalsToTweet.newBoostedProposals.push(proposals[proposalId]);
          }

    } else if(proposals[proposalId].executionTime > (Math.floor(Date.now()/1000)-12096e2)) {
      // check for proposals passed in the last 2 weeks
          let pTweet = `Genesis proposal passed: "${proposals[proposalId].title}"`;
          if(pTweet.length > 115) { pTweet = pTweet.slice(0,115)+"…"}
          pTweet = removeOddChars(pTweet);

          if(findMatch(pTweet, tweets) === false) {
            proposalsToTweet.newPassedProposals.push(proposals[proposalId]);
          }

    }
  })
  const total = (proposalsToTweet.newProposals.length +
                 proposalsToTweet.newBoostedProposals.length +
                 proposalsToTweet.newPassedProposals.length);
  console.log("Found--");
  console.log(`${proposalsToTweet.newProposals.length} untweeted new proposals,`);
  console.log(`${proposalsToTweet.newBoostedProposals.length} untweeted newly boosted proposals,`);
  console.log(`and ${proposalsToTweet.newPassedProposals.length} untweeted newly passed proposals, `);
  console.log(`for ${total} out of ${Object.keys(proposals).length} total.`)
  return proposalsToTweet;
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
    const tweets = await getTweets(twitInstance);
    const proposalsToTweet = await tweetableProposals(tweets, proposals);

    // if no tweetable proposals are found, stop
    if(proposalsToTweet.newProposals.length === 0 &&
        proposalsToTweet.newBoostedProposals.length === 0 &&
        proposalsToTweet.newPassedProposals.length === 0) {
      console.log("Not sending any new tweets.");
      return;
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
  getOldTweets: getTweets,
  getTweetableProposals: tweetableProposals,
  tweetProposalSet: tweet,
  tweetAllNewProposals: tweetNewProposals,
  twit: twitterId,
  url: cacheURL,
  interval: tweetInterval
}
