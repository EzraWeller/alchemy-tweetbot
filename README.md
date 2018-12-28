# alchemy-tweetbot
Rough tweetbot for tweeting out the activity of a DAO built on DAOstack's Alchemy app.

# Set-up

To use this tweetbot, you'll need:
 - A twitter developer account (with access token and secret)
 - A twitter account you want the bot to tweet from (and that account's id string)
 - The consumer key and consumer secret key for the bot account (use [twurl](https://github.com/twitter/twurl), if I remember correctly)
 - The avatar address of the DAO
 - The caching url of the DAO (for Genesis, it's `https://s3-us-west-2.amazonaws.com/daostack-alchemy-staging/initialArcState-live.json`)
 
Set up a .env file in the tweetbot directory with these variables:
```
CONSUMER_KEY=
CONSUMER_SECRET_KEY=
ACCESS_TOKEN=
ACCESS_TOKEN_SECRET=
AVATAR_ADDRESS=
CACHE_URL=
MINUTES=1
TEST=false
```
 
# Deploying
I recommend hosting on an AWS instance with Docker.
