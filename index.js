const url = require( 'url' );
const TelegramBot = require( 'node-telegram-bot-api' );
const FeedParser = require( 'feedparser' );
const request = require( 'request' );
const debug = require( 'debug' )( 'wp-telegram-bot' );
const db = require( './database' );
const xmpp = require( './xmpp' );

require( 'dotenv' ).load();

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot( token, { polling: true } );

function newPostForBlog( blogPath, postUrl ) {
	db.getChatsByBlogHost( blogPath ).then( chats => {
		chats.forEach( chat => bot.sendMessage( chat.chatId, postUrl ) );
	} );
}
xmpp.registerNewPostCallBack( newPostForBlog );

function followBlog( chatId, chatType, blogUrl ) {
	return Promise.resolve().then( () => {
		const urlParts = url.parse( blogUrl );

		if ( ! urlParts || ! urlParts.host ) {
			return Promise.reject( new Error( 'Bad blog url' ) );
		}

		const blogPath = urlParts.host + urlParts.path;

		return db.followBlog( chatId, blogPath, chatType ).then( () => xmpp.subscribe( blogPath ) );
	} );
}

function getUrlFromMsgText( msgText ) {
	const reResult = /follow ((http|https):\/\/\S+)/gi.exec( msgText );
	if ( reResult && reResult.length >= 2 ) {
		return reResult[ 1 ];
	}
	return null;
}

const usage = `Hi there!

Here's how you can use this bot:

* Create a channel or group
* Add this bot as an administrator
* Type 'follow https://yourexcellentsite.com' into the channel or group
* Voilà!  Your channel or group will now receive a notification everytime a new post is created
`;

bot.on( 'message', msg => {
	debug( 'received', msg );

	if ( msg.chat.type == 'private' ) {
		bot.sendMessage( msg.chat.id, usage );
	}

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
