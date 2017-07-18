const url = require( 'url' );
const TelegramBot = require( 'node-telegram-bot-api' );
const FeedParser = require( 'feedparser' );
const request = require( 'request' );
const debug = require( 'debug' )( 'wp-telegram-bot' );
const db = require( './database' );

require( 'dotenv' ).load();

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot( token, { polling: true } );

const blogsToPoll = [];
const POLL_INTERVAL = 1 * 60 * 1000;

( function blogWatcher() {
	const now = Date.now();
	for ( let i = 0; i < blogsToPoll.length; i++ ) {
		let blog = blogsToPoll[ i ];
		if ( now - blog.lastCheck > POLL_INTERVAL ) {
			getFeed( blog.feedUrl, ( error, items, meta ) => {
				if ( error ) {
					console.error( 'error while reading feed ' + blog.feedUrl, error );
					return;
				}
				updateChannel( blog.chatId, blog.feedUrl, items, meta );
			} );
			blog.lastCheck = now;
			setTimeout( blogWatcher, 100 );
			return;
		}
	}
	setTimeout( blogWatcher, 1000 );
} )();

( function watchExistingBlogs() {
	db.getAllBlogs().then( blogs => {
		blogs.forEach( blog => pollBlog( blog.chatId, blog.feedUrl, 0 ) );
	} );
} )();

function pollBlog( chatId, feedUrl, lastCheck = Date.now() ) {
	blogsToPoll.push( {
		chatId,
		feedUrl,
		lastCheck,
	} );
}

function updateChannel( chatId, feedUrl, rssItems, meta ) {
	const rssLinks = rssItems.map( rssItem => rssItem.link );
	return db.getBlogSharedLinksOnChat( chatId, feedUrl ).then( links => {
		const newLinks = rssLinks.filter( link => links.indexOf( link ) === -1 );
		if ( newLinks.length > 0 ) {
			return db.addBlogSharedLinksOnChat( chatId, feedUrl, newLinks ).then( () => {
				newLinks.forEach( link => bot.sendMessage( chatId, link ) );
			} );
		}
	} );
}

function followBlog( chatId, chatType, blogUrl ) {
	const feedUrl = getFeedUrl( blogUrl );

	return new Promise( ( resolve, reject ) => {
		// check that the feed url is accessible
		getFeed( feedUrl, ( error, items, meta ) => {
			if ( error ) {
				// TODO: send a message to inform the user that the url is not accessible
				return reject( error );
			}

			db.followBlog( chatId, feedUrl, chatType ).then( () => {
				updateChannel( chatId, feedUrl, items, meta );
				pollBlog( chatId, feedUrl );
				return resolve();
			} ).catch( () => {
				// TODO: we're probably already following this blog, inform the user
			} )
		} );
	} );
}

function getFeedUrl( blogUrl ) {
	return url.resolve( blogUrl, './feed' );
}

function getFeed( feedUrl, callback ) {
	const feedRequest = request( feedUrl );
	const feedparser = new FeedParser();
	const items = [];
	let meta = null;

	feedRequest.on( 'error', callback );
	feedRequest.on( 'response', ( response ) => {
		if ( response.statusCode !== 200 ) {
			callback( new Error( 'Bad status code' ) );
		} else {
			feedRequest.pipe( feedparser );
		}
	} );

	feedparser.on( 'error', callback );
	feedparser.on( 'readable', () => {
		let item;

		while ( item = feedparser.read() ) {
			items.push( item );
		}

		meta = feedparser.meta;
	} );
	feedparser.on( 'end', () => callback( null, items, meta ) );
}

function getUrlFromMsgText( msgText ) {
	const reResult = /follow ((http|https):\/\/\S+)/gi.exec( msgText );
	if ( reResult && reResult.length >= 2 ) {
		return reResult[ 1 ];
	}
	return null;
}

bot.on( 'message', msg => {
	if ( msg.chat.type !== 'group' ) {
		return;
	}

	const url = getUrlFromMsgText( msg.text );

	if ( ! url ) {
		return;
	}

	bot.getChatAdministrators( msg.chat.id )
	.then( administrators => {
		if ( administrators.filter( admin => admin.user.username === msg.from.username ).length === 0 ) {
				return Promise.reject( new Error( 'You need to be an administrator of the channel to do that' ) );
			}
		} )
		.then( () => followBlog( msg.chat.id, 'group', url ) )
		.then( () => bot.sendMessage( msg.chat.id, 'Following!' ) )
		.catch( error => bot.sendMessage( msg.chat.id, 'Error: ' + error.message ) );

} );

bot.on( 'channel_post', ( msg ) => {
	// ignore messages from groups
	if ( msg.chat.type !== 'channel' ) {
		return;
	}

	const url = getUrlFromMsgText( msg.text );

	if ( ! url ) {
		return;
	}

	debug( 'Following ' + url );

	// only admins can post to channel
	followBlog( msg.chat.id, 'channel', url ).then( () => {
		bot.sendMessage( msg.chat.id, 'Following!' );
	} ).catch( error => bot.sendMessage( msg.chat.id, 'Error: ' + error.message ) );
} );

require( 'http' ).createServer( ( request, response ) => {
	response.writeHead( 302, {
		'Location': 'https://t.me/WordPressDotComBot'
	} );
	response.end();
} ).listen( process.env.PORT || 4444 );
