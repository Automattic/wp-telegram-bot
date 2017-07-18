const url = require( 'url' );
const TelegramBot = require( 'node-telegram-bot-api' );
const FeedParser = require( 'feedparser' );
const request = require( 'request' );
const debug = require( 'debug' )( 'wp-telegram-bot' );
const db = require( './database' );


// replace the value below with the Telegram token you receive from @BotFather
const token = require( './secrets.json' ).BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot( token, { polling: true } );

function followBlog( chatId, chatType, blogUrl ) {
	try {
		const parsedUrl = url.parse( blogUrl );
		const blogFeedUrl = `${ parsedUrl.protocol }//${ parsedUrl.host }/feed/`;

		db.followBlog( chatId, chatType, parsedUrl.host );

		getFeed( blogFeedUrl, function( err, items ) {
			if ( err ) return;
			if ( items && items.length > 0 ) {
				const firstItem = items[0];
				bot.sendMessage( chatId, firstItem.link );
			}
		} );
	} catch ( exception ) {
		return false;
	}
}

function getFeed( feedUrl, callback ) {
	const feedRequest = request( feedUrl );
	const feedparser = new FeedParser();

	feedRequest.on( 'error', callback );

	feedRequest.on( 'response', function( response ) {
		const stream = this;

		if ( response.statusCode !== 200 ) {
			callback( new Error( 'Bad status code' ) );
		}
		else {
			stream.pipe(feedparser);
		}
	});

	feedparser.on( 'error', callback );

	feedparser.on( 'readable', function() {
		const stream = this;
		const meta = this.meta;
		const items = [];
		let item;

		while ( item = stream.read() ) {
			items.push( item );
		}

		callback( null, items, meta );
	} );
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
	followBlog( msg.chat.id, 'channel', url );
	bot.sendMessage( msg.chat.id, 'Following!' );

} );

