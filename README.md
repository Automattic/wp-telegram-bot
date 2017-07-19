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

