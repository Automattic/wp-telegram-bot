const debug = require( 'debug' )( 'wp-telegram-bot:xmpp' );
const xmpp = require( 'xmpp.js' );
const Client = xmpp.Client;
const xml = xmpp.xml;

require( 'dotenv' ).load();

const XMPP_USER = process.env.XMPP_USER;
const XMPP_PASS = process.env.XMPP_PASS;
const client = new Client( { jid: XMPP_USER, password: XMPP_PASS, preferred: 'PLAIN' } );

let newPostCallBack = null;

client.plugin( require( '@xmpp/plugins/starttls' ) );
client.plugin( require( '@xmpp/plugins/session-establishment' ) );

client.start( { uri: 'xmpp://xmpp.wordpress.com', domain: 'im.wordpress.com' } );

client.on( 'error', err => debug( err.toString() ) );
client.on( 'status', ( status, value ) => debug( 'status changed to', status, value ? value.toString() : '') );
client.on( 'close', () => debug( 'connection closed' ) );

client.on('online', jid => {
	debug( 'online as ' + jid.toString() );
	client.send( xmpp.xml( 'presence', { 'xml:lang': 'en' } ) );
} );

const botId = 'bot@im.wordpress.com';
let commandResponseCallback = null;

function handleBotReply( messages ) {
	debug( 'bot reply: ', messages );
	const channelMatch = /(\S+).channel: blog not found/.exec( messages[0] );
	const channelId = channelMatch && channelMatch.length > 0 ? channelMatch[1] : null;
    const subscriptionMessageParts = messages[1] && messages[1].split( ':' );
	let blog = null;
	let subscriptionMessage = null;
	if ( subscriptionMessageParts && subscriptionMessageParts.length > 1 ) {
		blog = subscriptionMessageParts[0].trim();
		subscriptionMessage = subscriptionMessageParts[1].trim();
	}

	if ( channelId && blog && subscriptionMessage ) {
		debug( `Response for subscription to ${blog} in channel ${channelId} was ${subscriptionMessage}` );
		commandResponseCallback( channelId, blog, subscriptionMessage );
	}
}

client.on('stanza', stanza => {
	debug( `received stanza: ${stanza.toString()}` );

	if ( stanza.is( 'message' ) ) {
		const body = stanza.getChild( 'body' );
		const from = stanza.attrs.from;

		if ( body ) {
			const messageText = body.getText();

			debug( `received message "${messageText}" from "${from}"` );

			if ( from === botId ) {
				handleBotReply( messageText.split( "\n" ) );
				return;
			}

			const postUrlMatch = messageText.match(/(https?:\/\/.*$)/gi);
			if ( postUrlMatch ) {
				const postUrl = postUrlMatch[0];
				let blogPath = stanza.attrs.from.replace( /∕/g, '/' );

				if ( blogPath.endsWith( '/' ) ) {
					blogPath = blogPath.slice(0, -1);
				}

				if ( ! postUrl.includes( '#comment' ) && typeof newPostCallBack === 'function' ) {
					newPostCallBack( blogPath, postUrl );
				}
			}
		}
	}
} );

client.handle('authenticate', authenticate => authenticate( XMPP_USER, XMPP_PASS ) )
client.handle('bind', bind => bind( 'bot' ) )

function sendMessage( to, text ) {
	debug( `sending message to ${ to } : ${ text }` );
	const message = xml('message', { to: to } , xml('body', null, text ) );
	return client.send( message );
}

// see: https://en.support.wordpress.com/jabber/
const subscribe = ( subPath, id ) => sendMessage( botId, `sub ${ id }.channel ${ subPath }/posts` );
const unsubscribe = unsubPath => sendMessage( botId, 'unsub ' + unsubPath );

const registerNewPostCallBack = callback => newPostCallBack = callback;
const registerCommandResponseCallBack = callback => commandResponseCallback = callback;

module.exports = {
	subscribe,
	unsubscribe,
	registerNewPostCallBack,
	registerCommandResponseCallBack,
};
