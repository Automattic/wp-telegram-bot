const debug = require( 'debug' )( 'wp-telegram-bot:xmpp' );
const xmpp = require( 'xmpp.js' );
const Client = xmpp.Client;
const xml = xmpp.xml;

require( 'dotenv' ).load();

const XMPP_USER = process.env.XMPP_USER;
const XMPP_PASS = process.env.XMPP_PASS;
const client = new Client( { jid: XMPP_USER, password: XMPP_PASS, preferred: 'PLAIN' } );

let newPostCallBack = null;

client.plugin( require('@xmpp/plugins/starttls') );

client.start( { uri: 'xmpp://xmpp.wordpress.com', domain: 'im.wordpress.com' } );

client.on( 'error', err => debug( err.toString() ) );
client.on( 'status', ( status, value ) => debug( 'status changed to', status, value ? value.toString() : '') );
client.on( 'close', () => debug( 'connection closed' ) );

client.on('online', jid => {
	debug( 'online as ' + jid.toString() );

	// workaround for: https://github.com/xmppjs/xmpp.js/pull/369
	// <iq type="set" id="5e5b6f40-5187-4373-9929-27c3149ca6ca-2"><session xmlns="urn:ietf:params:xml:ns:xmpp-session" /></iq>
	client.sendReceive(
		xml( 'iq', { type: 'set', id: 'session_set' },
			xml( 'session', 'urn:ietf:params:xml:ns:xmpp-session' )
		)
	)
	.then( data => client.send( xml( 'presence', { 'xml:lang': 'en' } ) ) );
} );

const replyHandlers = [];

const botName = 'bot@im.wordpress.com';

function handleBotReply( message ) {
	const lastCallback = replyHandlers.pop();
	if ( lastCallback ) {
		lastCallback( message );
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

			if ( from === botName ) {
				handleBotReply( messageText );
				return;
			}

			const postUrlMatch = messageText.match(/(https?:\/\/.*$)/gi);
			if ( postUrlMatch ) {
				const postUrl = postUrlMatch[0];
				const blogPath = stanza.attrs.from;

				if ( typeof newPostCallBack === 'function' ) {
					newPostCallBack( blogPath, postUrl );
				}
			}
		}
	}
} );

client.handle('authenticate', authenticate => authenticate( XMPP_USER, XMPP_PASS ) )
client.handle('bind', bind => bind( 'bot' ) )

function sendMessage( text ) {
	const message = xml('message', { to: botName } , xml('body', null, text ) );
	return client.send( message );
}

// see: https://en.support.wordpress.com/jabber/
function subscribe( blogPath, replyHandler ) {
	replyHandlers.push( replyHandler );
	sendMessage( `sub ${blogPath}/posts` );
}

const unsubscribe = blogPath => sendMessage( 'unsub ' + blogPath + '/posts' );
const registerNewPostCallBack = callback => newPostCallBack = callback;

module.exports = {
	subscribe,
	unsubscribe,
	registerNewPostCallBack
};
