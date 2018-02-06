const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const debug = require( 'debug' )( 'wp-telegram-bot:database' );

require( 'dotenv' ).load();

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wp-telegram-bot';
const dbP = MongoClient.connect( DB_URL );

function normalizeBlogPath( blogPath ) {
	const cleanPath = blogPath.replace(/∕/g, '/');

	return cleanPath.endsWith( '/' ) ? cleanPath : cleanPath + '/';
}

dbP.then( db => {
	debug( 'Connected to ' + DB_URL );

	db.collection( 'blogChats' ).ensureIndex( { chatId: 1, blogPath: 1 }, { unique: true } );
} );

function followBlog( chatId, blogPath, chatType ) {
	debug( `adding document for chat ${chatId}, blogPath ${blogPath} and chatType ${chatType}` );
	return dbP.then( db => db.collection( 'blogChats' ).insert( { chatId: parseInt( chatId ), chatType, blogPath: normalizeBlogPath( blogPath ), createdDate: new Date() } ) );
}

function unfollowBlog( chatId, blogPath ) {
	debug( `removing documents for chat ${chatId} and blogPath ${blogPath}` );
	return dbP.then( db => db.collection( 'blogChats' ).remove( { chatId: parseInt( chatId ), blogPath: normalizeBlogPath( blogPath ) }, { justOne: true } ) );
}

function getChatsByBlogHost( blogPath ) {
	const cleanPath = normalizeBlogPath( blogPath );
	debug( 'retrieving chats by path ' + cleanPath );
	return dbP.then( db => db.collection( 'blogChats' ).find( { blogPath: cleanPath } ).toArray() );
}

module.exports = {
	followBlog,
	unfollowBlog,
	getChatsByBlogHost,
};
