const TelegramBot = require( 'node-telegram-bot-api' );

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

function followBlog( url ) {
	// TODO: get RSS content for this blog
}

// Matches "/echo [whatever]"
bot.onText( /\/echo (.+)/, ( msg, match ) => {
	// 'msg' is the received Message from Telegram
	// 'match' is the result of executing the regexp above on the text content
	// of the message

	const chatId = msg.chat.id;
	const resp = match[1]; // the captured "whatever"

	// send back the matched "whatever" to the chat
	bot.sendMessage( chatId, resp );
} );

// Listen for any kind of message. There are different kinds of
// messages.
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
		followBlog( url );
	}

	// send a message to the chat acknowledging receipt of their message
	bot.sendMessage( msg.chat.id, 'Received your message' );
} );

