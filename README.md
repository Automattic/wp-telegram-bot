# How it works

Telegram <-> node.js app (with mongodb) <-> xmpp.wordpress.com

When you tell the bot to follow a blog, it using our jabber server that users can use as well, and subscribes to blog posts by messaging bot@im.wordpress.com with sub awesome.wordpress.com .

Now, when a post is being posted to the blog, jabber will notify our blog about the new post, the blog will then figure out if it's being followed in a telegram group/channel and message that group/channel with the new post.

You'll need a mongodb instance to develop locally, you can get one easily via docker:
```shell
docker run -d -p 27017:27017 -p 28017:28017 -e MONGODB_USER="telegram" -e MONGODB_DATABASE="telegram" -e MONGODB_PASS="qEpRcsp{3vkHYdpjJdT9}aLTp.P8zE" --name telegramdb tutum/mongodb
docker exec -it telegramdb /bin/bash
mongo telegram -u telegram -p qEpRcsp{3vkHYdpjJdT9}aLTp.P8zE
```
# Getting started with development

## create a WordPress.com account

This account will be subscribing to XMPP notifications for new posts - see [WordPress.com jabber](https://en.support.wordpress.com/jabber/).

No special permissions are required by this account - it will just be subscribing to publicly available WordPress.com and jetpack sites.

## create a telegram bot

Users will add this bot as an admin to their channel/group and then follow WordPress.com blogs.

This also needs no special initial permissions - users will need to add this bot to their channel/group to allow it to post.

## local configuration

Create a local `.env` file in the root of this project:

```shell
# telegram bot token
BOT_TOKEN=

# jabber credentials
XMPP_USER=
XMPP_PASS=

# mongo configuration
MONGODB_URI=mongodb://127.0.0.1:27017/wp-telegram-bot
```

Alternatively, you may define each of these environment variables in your shell.

## start server

```shell
npm install
npm start
```
## debugging

```shell
DEBUG=wp-telegram* npm start
```
