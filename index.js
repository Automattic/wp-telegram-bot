const url = require( 'url' );
const TelegramBot = require( 'node-telegram-bot-api' );
const FeedParser = require( 'feedparser' );
const request = require( 'request' );
const debug = require( 'debug' )( 'wp-telegram-bot' );

// replace the value below with the Telegram token you receive from @BotFather
const token = require( './secrets.json' ).BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot( token, { polling: true } );

const chats = {};

function hasJoinedChat( chatId ) {
	return !! chats[ chatId ];
}

function joinChat( chat ) {
	chats[ chat.id ] = chat;
}

function followBlog( chatId, blogUrl ) {
	try {
		const parsedUrl = url.parse( blogUrl );
		const blogFeedUrl = `${ parsedUrl.protocol }//${ parsedUrl.host }/feed/`;
		getFeed( blogFeedUrl, function( err, items ) {
			if ( err ) return;
			if ( items && items.length > 0 ) {
				const firstItem = items[0];
				bot.sendMessage( chatId, firstItem.title + ' ' + firstItem.summary );
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

bot.on( 'channel_post', ( msg ) => {
	if ( ! hasJoinedChat( msg.chat.id ) ) {
		joinChat( msg.chat );
	}

	// ignore messages from groups
	if ( msg.chat.type !== 'channel' ) {
		return;
	}

	const reResult = /follow ((http|https):\/\/\S+)/gi.exec( msg.text );

	if ( reResult && reResult.length >= 2 ) {
		const url = reResult[1];

		debug( 'Following ' + url );

		bot.getChatAdministrators( msg.chat.id, msg.chat.username )
			.then( administrators => {
				if ( administrators.filter( admin => admin.user.username === msg.chat.username ).length === 0 ) {
					return new Error( 'You need to be an administrator of the channel to do that' );
				}
			} )
			.then( () => followBlog( msg.chat.id, url ) )
			.then( () => bot.sendMessage( msg.chat.id, 'Following!' ) )
			.catch( error => bot.sendMessage( msg.chat.id, 'Error: ' + error.message ) );
	}
} );

