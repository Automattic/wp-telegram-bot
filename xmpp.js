const xmpp = require( 'xmpp.js' );
const Client = xmpp.Client;
const xml = xmpp.xml;

const secrets = require( './secrets.json' );
const XMPP_USER = secrets.XMPP_USER;
const XMPP_PASS = secrets.XMPP_PASS;
const client = new Client();
client.plugin( require('@xmpp/plugins/starttls') )

client.start( { uri: 'xmpp://xmpp.wordpress.com', domain: 'im.wordpress.com' } )

client.on('error', err => {
  console.error('❌', err.toString())
})

client.on('status', (status, value) => {
  console.log('🛈i status changed to', status, value ? value.toString() : '')
})

// Useful for logging raw traffic
// Emitted for every incoming fragment
client.on('input', data => console.log('⮈', data))
// Emitted for every outgoing fragment
client.on('output', data => console.log('⮊', data))


client.on('online', jid => {
  console.log('🗸', 'online as', jid.toString())
//	client.send(xml('presence'))

setInterval( () => { client.send(xml('presence'))  }, 15 * 1000 );
/*
<iq from='juliet@example.com/balcony' type='set' id='roster_2'>
  <query xmlns='jabber:iq:roster'>
    <item jid='nurse@example.com'
          name='Nurse'>
      <group>Servants</group>
    </item>
  </query>
</iq>


	const message = xml( 'iq', {from: 'wpcomtelegrambot@im.wordpress.com', type: 'set', id: 'roster_1' },
		xml( 'query', 'jabber:iq:roster',
			xml( 'item', { jid: 'yurynix@im.wordpress.com', name: 'Yury' } )
		)
	);

    client.send( message ).then( d => console.log( 'd', d ), err => console.log( 'e', err ) );

*/
	const message2 = xml('message', {from: 'wpcomtelegrambot@im.wordpress.com', to: 'yurynix@im.wordpress.com', id: 'msg_1', type: 'chat' } , xml( 'body', null, 'howdy' ) );

	client.send( message2 ).then( d => console.log( 'd', d ), err => console.log( 'e', err ) );

	/*subscribe( 'scruffian.blog' ); */
})

client.on('stanza', stanza => {
  console.log('>> Stanza', stanza.toString())
})

client.handle('authenticate', authenticate => authenticate( XMPP_USER, XMPP_PASS ) )
client.handle('bind', bind => bind( 'bot' ) )

function subscribe( blogHost ) {
	const message = xml('message', {to: 'bot@im.wordpress.com '} , xml('body', 'sub ' + blogHost ) );
	client.send( message ).then( d => console.log( 'd', d ), err => console.log( 'e', err ) ); 
}

module.exports = {
	subscribe
};
