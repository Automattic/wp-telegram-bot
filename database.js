const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const debug = require( 'debug' )( 'wp-telegram-bot:database' );


const DB_URL = require( './secrets.json' ).DB_URL || 'mongodb://127.0.0.1:27017';
const dbP = MongoClient.connect( DB_URL );

dbP.then( () => debug( 'Connected to ' + DB_URL ) );

// db.blogChats.createIndex( { chatId: 1, chatType: 1, blogHost: 1 }, { unique: true } );
function followBlog( chatId, chatType, feedUrl ) {
	return dbP.then( db => db.collection( 'blogChats' ).insert( { chatId, chatType, feedUrl, createdDate: new Date() } ) );
}

function unfollowBlog( chatId ) {
	return dbP.then( db => db.collection( 'blogChats' ).remove( { chatId }, { justOne: true } ) );
}

function getChatsByFeed( feedUrl ) {
	return dbP.then( db => db.collection( 'blogChats' ).find( { feedUrl } ).toArray() );
}

module.exports = {
	followBlog,
	unfollowBlog,
	getChatsByFeed,
};

