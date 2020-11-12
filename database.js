const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const debug = require( 'debug' )( 'wp-telegram-bot:database' );

require( 'dotenv' ).load();

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wp-telegram-bot';

let db = null;
const dbP = () => new Promise( ( resolve ) => {
	if ( db !== null ) {
		return resolve( db );
	}

	return MongoClient
		.connect( DB_URL )
		.then( client => {
			debug( 'Connected to ' + DB_URL );

			db = client.db( 'heroku_zpjz44tv' );
			db.collection( 'blogChats' ).ensureIndex( { chatId: 1, blogPath: 1 }, { unique: true } );

			return db;
		} );
} );

function followBlog( chatId, blogPath, chatType ) {
	debug( `adding document for chat ${chatId}, blogPath ${blogPath} and chatType ${chatType}` );
	const document = {
		chatId: parseInt( chatId ),
		chatType,
		blogPath: blogPath,
		createdDate: new Date()
	};
	return dbP()
		.then( db => db.collection( 'blogChats' ).insert( document ) );
}

function unfollowBlog( chatId, blogPath ) {
	debug( `removing documents for chat ${chatId} and blogPath ${blogPath}` );
	const criteria = { chatId: parseInt( chatId ), blogPath: blogPath };
	const limit = { justOne: true };
	return dbP()
		.then( db => db.collection( 'blogChats' ).remove( criteria, limit ) )
		.then( response => response.result && response.result.n );
}

function getChatsByBlogHost( blogPath ) {
	debug( `retrieving chats by blogPath ${blogPath}` );
	return dbP.then( db => db.collection( 'blogChats' ).find( { blogPath: blogPath } ).toArray() );
}

function getFollowedBlogs( chatId ) {
	debug( `retrieving chats by chatId ${chatId}` );
	const criteria = { chatId: parseInt( chatId ) };
	return dbP()
		.then(
			db => db.collection( 'blogChats' ).find( criteria ).toArray()
		);
}

function clearFollowedBlogs( chatId ) {
	debug( `removing all documents for chatId ${chatId}` );
	const criteria = { chatId: parseInt( chatId ) };
	return dbP()
		.then( db => db.collection( 'blogChats' ).remove( criteria ) )
		.then( response => response.result && response.result.n );
}

module.exports = {
	clearFollowedBlogs,
	followBlog,
	getChatsByBlogHost,
	getFollowedBlogs,
	unfollowBlog,
};
