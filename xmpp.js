const Client = require( 'xmpp.js' ).Client;
const secrets = require( './secrets.json' );
const XMPP_USER = secrets.XMPP_USER;
const XMPP_PASS = secrets.XMPP_PASS;
const client = new Client();

client.start( { uri: 'xmpp://xmpp.wordpress.com', domain: 'im.wordpress.com' } )

client.on('error', err => {
  console.error('❌', err.toString())
})

client.on('status', (status, value) => {
  console.log('🛈', status, value ? value.toString() : '')
})

client.on('online', jid => {
  console.log('🗸', 'online as', jid.toString())
})

client.on('stanza', stanza => {
  console.log('⮈', stanza.toString())
})

client.handle('authenticate', authenticate => {
	return authenticate( XMPP_USER, XMPP_PASS );
})
