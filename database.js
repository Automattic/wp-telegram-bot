const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const debug = require( 'debug' )( 'wp-telegram-bot:database' );

require( 'dotenv' ).load();

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wp-telegram-bot';
const dbP = MongoClient.connect( DB_URL );

dbP.then( db => {
	debug( 'Connected to ' + DB_URL );

	db.collection( 'blogChats' ).ensureIndex( { chatId: 1, blogPath: 1 }, { unique: true } );
} );

function followBlog( chatId, blogPath, chatType ) {
	return dbP.then( db => db.collection( 'blogChats' ).insert( { chatId, chatType, blogPath, createdDate: new Date() } ) );
}

function unfollowBlog( chatId, blogPath ) {
	return dbP.then( db => db.collection( 'blogChats' ).remove( { chatId, blogPath }, { justOne: true } ) );
}

function getChatsByBlogHost( blogPath ) {
	return dbP.then( db => db.collection( 'blogChats' ).find( { blogPath } ).toArray() );
}

module.exports = {
	followBlog,
	unfollowBlog,
	getChatsByBlogHost,
};

