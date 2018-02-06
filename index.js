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

function commandResponseReceived( id, blog, subscriptionMessage ) {
	if ( subscriptionMessage === 'blog not found' ) {
		bot.sendMessage( id, `${blog} is not a WordPress.com site` );
		return;
	}
	db.followBlog( id, blog, 'channel' )
		.then(
			() => bot.sendMessage( id, `Now following ${blog}` )
		)
		.catch(
			error => handleError( error, id, blog )
		);
}

xmpp.registerCommandResponseCallBack( commandResponseReceived );

function blogPath( blogUrl ) {
	const urlParts = url.parse( blogUrl );

	if ( ! urlParts || ! urlParts.host ) {
		return Promise.reject( new Error( 'Bad blog url' ) );
	}

	return urlParts.host + urlParts.path;
}

function followBlog( chatId, blogUrl ) {
	return Promise.resolve()
		.then( () => xmpp.subscribe( blogPath( blogUrl ), chatId ) );
}

function extractCommand( msgText ) {
	const unfollowResult = /unfollow ((http|https):\/\/\S+)/gi.exec( msgText );
	if ( unfollowResult && unfollowResult.length > 1) {
		return { method: 'unfollow', blog: unfollowResult[ 1 ] };

	}
	const followResult = /follow ((http|https):\/\/\S+)/gi.exec( msgText );
	if ( followResult && followResult.length > 1 ) {
		return { method: 'follow', blog: followResult[ 1 ] };
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

function handleError( error, id, url ) {
	debug( error.message );

	if ( error.name === 'MongoError' && error.code === 11000 ) {
		return bot.sendMessage( id, `You seem to already be following ${url}` );
	}

	return bot.sendMessage( id, error.message );
}

function processCommand( id, command ) {
	if ( command.method === 'follow' ) {
		return followBlog( id, command.blog );
	}
	if ( command.method === 'unfollow' ) {
		return db.unfollowBlog( id, blogPath( command.blog ) )
			.then(
				() => bot.sendMessage( id, `No longer following ${command.blog}` )
			);
	}
	return null;
}

bot.on( 'message', msg => {
	debug( 'received', msg );

	if ( msg.chat.type === 'private' ) {
		bot.sendMessage( msg.chat.id, usage );
		return;
	}

	if ( msg.chat.type !== 'group' ) {
		return;
	}

	const command = extractCommand( msg.text );

	if ( ! command ) {
		return;
	}

	bot.getChatAdministrators( msg.chat.id )
		.then( administrators => {
			if ( administrators.filter( admin => admin.user.username === msg.from.username ).length === 0 ) {
				return Promise.reject( new Error( 'You need to be an administrator of the channel to do that' ) );
			}
		} )
		.then( () => processCommand( msg.chat.id, command ) )
		.catch( error => handleError( error, msg.chat.id, url ) );
} );

bot.on( 'channel_post', ( msg ) => {
	debug( 'received', msg );
	// ignore messages from groups
	if ( msg.chat.type !== 'channel' ) {
		return;
	}

	const command = extractCommand( msg.text );

	if ( ! command ) {
		return;
	}

	debug( 'Following ' + url );

	// only admins can post to channel
	processCommand( msg.chat.id, command )
		.catch( error => handleError( error, msg.chat.id, url ) );
} );

require( 'http' ).createServer( ( request, response ) => {
	response.writeHead( 302, {
		'Location': 'https://t.me/WordPressDotComBot'
	} );
	response.end();
} ).listen( process.env.PORT || 4444 );
