var Web3 = require('web3');
var web3 = new Web3("wss://ropsten.infura.io/ws");

var config = require('./.secret.json');

// last session
const fs = require('fs');
const session_file_path = './.secret.slacksession.json'

function restore_session() {
	if (fs.existsSync(session_file_path)) {
		return require(session_file_path);
	} else {
		return {'block': 5474580, 'tx': 0};
	}
}

var session = restore_session();

function save_session() {
	fs.writeFileSync(session_file_path, JSON.stringify(session));
  console.log('Session saved');
}

//simplestorageのABI
var abi = require('./build/contracts/EthLog.json');

//デプロイしたアドレス
var address = abi.networks['3'].address;
const ethLog = new web3.eth.Contract(abi.abi, address, {});

ethLog.getPastEvents("allEvents", {fromBlock: session.block}).then((events) => {
	console.log("past events");
	events.forEach(processEvent);
});

var event = ethLog.events.Speech();
event.on('data', (ev) => {
	processEvent(ev);
});
event.on('changed', (ev) => {
	console.log(ev);
});
event.on('error', (ev) => {
	console.error(ev);
});

// Slack API
function send(data) {
	var request = require('request');
	data.channel = config.slack.channel;
	request({
		uri: config.slack.webhook,
		method: 'POST',
		json: data
	});
}

function send_update(username, text) {
	var payload = {
		"icon_url": 'https://cdn4.iconfinder.com/data/icons/cryptocoins/227/ETH-512.png',
		"username": `@${username}@ropsten`,
		"text": `${text}`
	};
	send(payload);
}

async function processEvent(event) {

  console.log(session, event.blockNumber, event.transactionIndex);
	if (session.block > event.blockNumber ||
		(session.block == event.blockNumber && session.tx >= event.transactionIndex)) {
    console.log('skip');
		return;
	}
	session.block = event.blockNumber
	session.tx = event.transactionIndex;

	const sender = event.returnValues[0];
	const body = event.returnValues[1];
	const nickname = await ethLog.methods.getNickname(sender).call();
	const username = web3.utils.hexToUtf8(nickname);
	console.log(`${username}: ${body}`, event.blockNumber, event.transactionIndex);
	send_update(username, body);
}

setInterval(save_session, 10000);
