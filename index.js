const url = require( 'url' );
const TelegramBot = require( 'node-telegram-bot-api' );
const FeedParser = require('feedparser');
const request = require('request');

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

bot.on( 'message', ( msg ) => {
	if ( ! hasJoinedChat( msg.chat.id ) ) {
		joinChat( msg.chat );
	}

	// ignore messages from groups
	if ( msg.chat.type !== 'channel' ) {
		return;
	}

	const reResult = /follow ((http|https):\/\/\S+)/gi.exec( 'follow https://stackoverflow.com/questions/4643' );

	if ( reResult && reResult.length >= 2 ) {
		const url = reResult[1];

		// TODO: check that msg.from is admin on the channel
		followBlog( msg.chat.id, url );
	}

	// send a message to the chat acknowledging receipt of their message
	bot.sendMessage( msg.chat.id, 'Received your message' );
} );

