const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const debug = require( 'debug' )( 'wp-telegram-bot:database' );


const DB_URL = require( './secrets.json' ).DB_URL;
const dbP = MongoClient.connect( DB_URL );

dbP.then( () => debug( 'Connected to ' + DB_URL ) );

// 
function followBlog( chatId, chatType, blogHost ) {
	return dbP.then( db => db.collection( 'blogChats' ).insert( { chatId, chatType, blogHost, createdDate: new Date() } ) );
}

function unfollowBlog( chatId, chatType, blogHost ) {
	return dbP.then( db => db.collection( 'blogChats' ).remove( { chatId, chatType, blogHost }, { justOne: true } ) );
}

module.exports = {
	followBlog,
	unfollowBlog,
};

