```shell
docker run -d -p 27017:27017 -p 28017:28017 -e MONGODB_USER="telegram" -e MONGODB_DATABASE="telegram" -e MONGODB_PASS="qEpRcsp{3vkHYdpjJdT9}aLTp.P8zE" --name telegramdb tutum/mongodb
docker exec -it telegramdb /bin/bash
mongo telegram -u telegram -p qEpRcsp{3vkHYdpjJdT9}aLTp.P8zE
```

Make sure you create the unique index: `db.blogChats.createIndex( { chatId: 1, chatType: 1, blogHost: 1 }, { unique: true } );`
