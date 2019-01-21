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

// put original URLs back in a tweet
function fixURLs(tweetText, tweetURLs) {
  let newTweetText = tweetText;
  tweetURLs.forEach((url) => {
    if(url.display_url.slice(0,7) !== 'alchemy') {
      newTweetText = newTweetText.replace(url.url, url.display_url);
    }
  })
  return newTweetText;
}

// function to fix all URLs in all tweets
function editTweetURLs(tweets) {
  let editedTweets = [];
  tweets.data.forEach((tweet) => {
    // maybe get rid of very old tweets ? (> 1 week?)
    let tweetText = tweet.text.slice(0, -24)
    if(tweet.entities.urls.length > 1) { tweetText = fixURLs(tweetText, tweet.entities.urls) };
    editedTweets.push(tweetText);
  });
  return editedTweets;
}

// function to grab all tweets from the twitter account
const getTweets = async (twitterDict) => {
  console.log("getting already tweeted tweets");
  const response = await twitterDict.get('statuses/user_timeline',
    // your twitter bot's id string
    { id_str: '1043553688424452097', count: 200 });
    /*
    NOTE: Not sure what this will do when there are > 200 tweets, and
    if the DAO is ever producing >200 proposals per 3 day period, this
    function will probably need to be adjusted to grab more tweets
    (run the function more than once, stop if it grabs less than 200 tweets?).
    */
  let tweets = editTweetURLs(response);
  return tweets;
}

// check if query is in array
function findMatch(query, array) {
  let matchFound = false;
  array.forEach((item) => {
    if(query === item) {
      matchFound = true;
    }
  });
  return matchFound;
}

// replace ampersands
function removeOddChars(string) {
  let noAmps = string.replace(/&(?!amp;)/g, '&amp;');
  return noAmps;
}

function filterTweet(baseString, proposal, tweets) {
  let tweet = baseString+`"${proposal.title}"`;
  if(tweet.length > 116) { tweet = tweet.slice(0,115)+'…'};
  tweet = removeOddChars(tweet);

  if(findMatch(tweet, tweets) === false) {
    return true
  }
}

// function to find proposals that haven't yet been tweeted about
const tweetableProposals = (tweets, proposals) => {
  console.log("finding untweeted proposals");
  const proposalsToTweet = {newProposals: [], newBoostedProposals: [], newPassedProposals: []};
  Object.keys(proposals).forEach((proposalId) => {
    // check for proposals not boosted or passed and submitted in the past 3 weeks
    // and not expired
    if(proposals[proposalId].executionTime === 0 &&
      proposals[proposalId].boostedTime === 0 &&
      proposals[proposalId].submittedTime > (Math.floor(Date.now()/1000)-18144e2) &&
      (proposals[proposalId].submittedTime +
      proposals[proposalId].preBoostedVotePeriodLimit >
      Math.floor(Date.now()/1000))) {

        if(filterTweet("New proposal posted to Genesis: ",
                        proposals[proposalId], tweets) === true) {
          proposalsToTweet.newProposals.push(proposals[proposalId]);
        }

    // check for boosted proposals not passed and not expired
    } else if(proposals[proposalId].executionTime === 0 &&
              proposals[proposalId].boostedTime > 0 &&
              (proposals[proposalId].boostedTime +
              proposals[proposalId].boostedVotePeriodLimit >
              Math.floor(Date.now()/1000))) {

        if(filterTweet("Genesis proposal boosted: ",
                        proposals[proposalId], tweets) === true) {
          proposalsToTweet.newBoostedProposals.push(proposals[proposalId]);
        }

    // check for proposals passed within the last 2 weeks
    } else if(proposals[proposalId].executionTime > (Math.floor(Date.now()/1000)-12096e2)) {

        if(filterTweet("Genesis proposal passed: ",
                        proposals[proposalId], tweets) === true) {
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
  twitterAccount,
  getProposals,
  getTweets,
  tweetableProposals,
  tweet,
  tweetNewProposals,
  twitterId,
  editTweetURLs,
  cacheURL,
  tweetInterval,
  twitterId
}
