const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const debug = require( 'debug' )( 'wp-telegram-bot:database' );

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wp-telegram-bot';
const dbP = MongoClient.connect( DB_URL );

dbP.then( db => {
	debug( 'Connected to ' + DB_URL );
	const blogChats = db.collection( 'blogChats' );

	blogChats.ensureIndex( { chatId: 1, feedUrl: 1 }, { unique: true } );
} );

function followBlog( chatId, feedUrl, chatType ) {
	return dbP.then( db => db.collection( 'blogChats' ).insert( { chatId, chatType, feedUrl, createdDate: new Date(), links: [] } ) );
}

function unfollowBlog( chatId, feedUrl ) {
	return dbP.then( db => db.collection( 'blogChats' ).remove( { chatId, feedUrl }, { justOne: true } ) );
}

function getChatsByFeed( feedUrl ) {
	return dbP.then( db => db.collection( 'blogChats' ).find( { feedUrl } ).toArray() );
}

function getAllBlogs() {
	return dbP.then( db => db.collection( 'blogChats' ).find( {} ).toArray() );
}

function getBlogSharedLinksOnChat( chatId, feedUrl ) {
	return dbP.then( db => (
		db.collection( 'blogChats' ).findOne( { chatId, feedUrl } ).then( chat => {
			return Promise.resolve( chat.links || [] );
		} )
	) );
}

function addBlogSharedLinksOnChat( chatId, feedUrl, links ) {
	return dbP.then( db => { db.collection( 'blogChats' ).update( { chatId, feedUrl }, { $pushAll: { links } } ) } );
}

module.exports = {
	followBlog,
	unfollowBlog,
	getChatsByFeed,
	getAllBlogs,
	getBlogSharedLinksOnChat,
	addBlogSharedLinksOnChat,
};

