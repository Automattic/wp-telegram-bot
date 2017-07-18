const debug = require( 'debug' )( 'wp-telegram-bot:xmpp' );
const xmpp = require( 'xmpp.js' );
const Client = xmpp.Client;
const xml = xmpp.xml;

const secrets = require( './secrets.json' );
const XMPP_USER = secrets.XMPP_USER;
const XMPP_PASS = secrets.XMPP_PASS;
const client = new Client( { jid: XMPP_USER, password: XMPP_PASS, preferred: 'PLAIN' } );

let newPostCallBack = null;

client.plugin( require('@xmpp/plugins/starttls') );

client.start( { uri: 'xmpp://xmpp.wordpress.com', domain: 'im.wordpress.com' } );

client.on('error', err => debug( err.toString() ) );
client.on('status', ( status, value ) => debug( 'status changed to', status, value ? value.toString() : '') );
client.on('close', debug( 'connection closed' ) );

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

client.on('stanza', stanza => {
	console.log('>> Stanza', stanza.toString())
	if ( stanza.is( 'message' ) ) {
		debug( 'got message ' + stanza.toString() );
		const body = stanza.getChild( 'body' );

		if ( body ) {
			const messageText = body.getText();
			const postUrlMatch = messageText.match(/(https?:\/\/.*$)/gi);
			if ( postUrlMatch ) {
				const postUrl = urlMatch[0];
				const blogHost = stanza.attrs.from;

				if ( typeof newPostCallBack === 'function' ) {
					newPostCallBack( blogHost, postUrl );
				}
			}
		}
	}
} );

client.handle('authenticate', authenticate => authenticate( XMPP_USER, XMPP_PASS ) )
client.handle('bind', bind => bind( 'bot' ) )

function sendMessage( to, text ) {
	const message = xml('message', { to: to } , xml('body', null, text ) );
	return client.send( message );
}

const subscribe = blogHost => sendMessage( 'bot@im.wordpress.com', 'sub ' + blogHost );
const unsubscribe = blogHost => sendMessage( 'bot@im.wordpress.com', 'unsub ' + blogHost );
const registerNewPostCallBack = callback => newPostCallBack = callback;

module.exports = {
	subscribe,
	unsubscribe,
	registerNewPostCallBack
};
