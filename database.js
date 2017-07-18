const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const debug = require( 'debug' )( 'wp-telegram-bot:database' );


const DB_URL = require( './secrets.json' ).DB_URL || 'mongodb://127.0.0.1:27017/wp-telegram-bot';
const dbP = MongoClient.connect( DB_URL );

dbP.then( db => {
	debug( 'Connected to ' + DB_URL );
	const blogChats = db.collection( 'blogChats' );

	blogChats.ensureIndex( { chatId: 1 }, { unique: true } );
	blogChats.ensureIndex( { chatType: 1 } );
	blogChats.ensureIndex( { feedUrl: 1 } );
} );

function followBlog( chatId, chatType, feedUrl ) {
	return dbP.then( db => db.collection( 'blogChats' ).insert( { chatId, chatType, feedUrl, createdDate: new Date(), links: [] } ) );
}

function unfollowBlog( chatId ) {
	return dbP.then( db => db.collection( 'blogChats' ).remove( { chatId }, { justOne: true } ) );
}

function getChatsByFeed( feedUrl ) {
	return dbP.then( db => db.collection( 'blogChats' ).find( { feedUrl } ).toArray() );
}

function getAllBlogs() {
	return dbP.then( db => db.collection( 'blogChats' ).find( {} ).toArray() );
}

function getSharedLinksOnChat( chatId ) {
	return dbP.then( db => (
		db.collection( 'blogChats' ).findOne( { chatId } ).then( chat => {
			return Promise.resolve( chat.links || [] );
		} )
	) );
}

function addSharedLinksOnChat( chatId, links ) {
	return dbP.then( db => { db.collection( 'blogChats' ).update( { chatId }, { $pushAll: { links } } ) } );
}

module.exports = {
	followBlog,
	unfollowBlog,
	getChatsByFeed,
	getAllBlogs,
	getSharedLinksOnChat,
	addSharedLinksOnChat,
};

