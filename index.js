const url = require( 'url' );
const TelegramBot = require( 'node-telegram-bot-api' );
const request = require( 'request' );
const debug = require( 'debug' )( 'wp-telegram-bot' );
const db = require( './database' );
const xmpp = require( './xmpp' );

require( 'dotenv' ).load();

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot( token, { polling: true } );

let botUserName = null;
bot.getMe().then( me => botUserName = me.username );

function newPostForBlog( blogPath, postUrl ) {
	const blogUrl = normalizeBlogUrl( blogPath )
	db.getChatsByBlogHost( blogUrl ).then( chats => {
		// If we don't have any telegram channels/groups for that blog
		// anymore, remove subscription on xmpp as well:
		if ( chats.length === 0 ) {
			xmpp.unsubscribe( blogUrl );
			return;
		}

		chats.forEach( chat => bot.sendMessage( chat.chatId, postUrl ) );
	} );
}

xmpp.registerNewPostCallBack( newPostForBlog );

function commandResponseReceived( id, blog, subscriptionMessage ) {
	if ( subscriptionMessage === 'blog not found' ) {
		bot.sendMessage( id, `${blog} is not a WordPress.com site` );
		return;
	}
	const blogUrl = normalizeBlogUrl( blog );
	db.followBlog( id, blogUrl, 'channel' )
		.then(
			() => bot.sendMessage( id, `Now following ${blogUrl}` )
		)
		.catch(
			error => handleError( error, id, blogUrl )
		);
}

xmpp.registerCommandResponseCallBack( commandResponseReceived );

function normalizeBlogUrl( blogUrl ) {
	// Following other feeds than /posts is disabled
	// as subscriptions are shared between chats at the moment
	// Let's strip all accepted types of custom feeds from the url
	// See accepted types here: https://en.support.wordpress.com/feeds/#your-feeds
	blogUrl = blogUrl.replace( /https?:\/\/|\/comments|((\/category|\/author|\/tag)\/[^ \/]+)?\/feeds\/?/ig, '' );

	const urlParts = url.parse( `http://${blogUrl}` );

	if ( ! urlParts || ! urlParts.host ) {
		throw new Error( 'Bad blog url' );
	}

	let host = urlParts.host, path = urlParts.path;

	if ( host.indexOf( '.' ) === -1 ) {
		host += '.wordpress.com';
	}

	if ( path === '/' ) {
		path = '';
	}

	return host + path;
}

function extractUrl( text ) {
	const result = /(https?:\/\/)?(\S+)/i.exec( text );
	if ( result && result.length > 2 ) {
		return result[2];
	}
	throw new Error( `${text} does not contain a valid site address` );
}

function parseCommand( text ) {
	const parts = /^\/(\w+)(@\w+)?( (.*))?$/.exec( text );
	let command, parameters;

	if ( parts && parts.length === 5 ) {
		command = parts[1];
		parameters = ( parts[3] || '' ).trim().toLowerCase();
	}

	switch ( command ) {
	case 'start':
	case 'help':
		return { method: 'usage' };
	case 'follow':
		return { method: 'follow', blog: extractUrl( parameters ) };
	case 'unfollow':
		return { method: 'unfollow', blog: extractUrl( parameters ) };
	case 'following':
		return { method: 'following' };
	case 'reset':
		return { method: 'reset' };
	default:
		return { method: 'unknown' };
	}
}

const usage = ( suffix ) => `Hi there!

Here's how you can use this bot:

* Create a channel or group
* Add this bot as an administrator
* Execute the '/follow${suffix}' command and then the site url
* Voilà!  Your channel or group will now receive a notification everytime a new post is created
`;

function handleError( error, id, url ) {
	debug( error.message );

	if ( error.name === 'MongoError' && error.code === 11000 ) {
		return bot.sendMessage( id, `You seem to already be following ${url}` );
	}

	return bot.sendMessage( id, error.message );
}

function sendUnfollowAcknowledgement( id, blog, count ) {
	if ( count === 0) {
		bot.sendMessage( id, `It seems you were not following ${blog}` );
	} else {
		bot.sendMessage( id, `No longer following ${blog}` );
	}
}

function processCommand( id, command, username ) {
	const suffix = username ? `@${username}` : '';
	debug( 'processing command', id, command );
	switch( command.method ) {
	case 'usage':
		bot.sendMessage( id, usage( suffix ) );
		break;
	case 'follow':
		// we do not send a bot response yet:
		// the response to xmpp sub command will trigger the response
		return Promise.resolve()
			.then( () => xmpp.subscribe( normalizeBlogUrl( command.blog ), id ) );
	case 'unfollow':
		// we do not send an xmpp unsub command yet:
		// other channels may have a subscription to this same blog.
		return Promise.resolve()
			.then( () => db.unfollowBlog( id, normalizeBlogUrl( command.blog ) ) )
			.then( ( result ) => sendUnfollowAcknowledgement( id, command.blog, result ) );
	case 'following':
		return db.getFollowedBlogs( id )
			.then(
				blogs => {
					if ( blogs.length == 0 ) {
						bot.sendMessage( id, 'You are not following any sites' );
					} else {
						const blogsDescription = blogs.map( blog => blog.blogPath );
						bot.sendMessage(
							id,
							`You are following:\n${blogsDescription.join("\n")}`
						);
					}
				}
			);
	case 'reset':
		return db.clearFollowedBlogs( id )
			.then(
				count => bot.sendMessage( id, `Removed ${ count } sites` )
			);
	default:
		bot.sendMessage( id, "Sorry, I don't know what you mean." );
	}
	return Promise.resolve();
}

bot.on( 'message', msg => {
	debug( 'received message', msg );

	if ( msg.chat.type === 'private' ) {
		const command = parseCommand( msg.text );
		if ( command ) {
			processCommand( msg.chat.id, command );
		}
		return;
	}

	if ( msg.chat.type !== 'group' ) {
		return;
	}

	const command = parseCommand( msg.text );

	if ( ! command ) {
		return;
	}

	bot.getChatAdministrators( msg.chat.id )
		.then( administrators => {
			if ( administrators.filter( admin => admin.user.username === msg.from.username ).length === 0 ) {
				return Promise.reject( new Error( 'You need to be an administrator of the channel to do that' ) );
			}
		} )
		.then( () => processCommand( msg.chat.id, command, botUserName ) )
		.catch( error => handleError( error, msg.chat.id, command.blog ) );
} );

bot.on( 'channel_post', ( msg ) => {
	debug( 'received', msg );

	// ignore messages from groups
	if ( msg.chat.type !== 'channel' ) {
		return;
	}

	const command = parseCommand( msg.text );

	if ( command ) {
		// only admins can post to channel
		processCommand( msg.chat.id, command, botUserName )
			.catch( error => handleError( error, msg.chat.id, command.blog ) );
	}
} );

require( 'http' ).createServer( ( request, response ) => {
	response.writeHead( 302, {
		'Location': 'https://t.me/WordPressDotComBot'
	} );
	response.end();
} ).listen( process.env.PORT || 4444 );
