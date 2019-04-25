var Web3 = require('web3');
var web3 = new Web3("wss://ropsten.infura.io/ws");

var config = require('./.secret.json');

//simplestorageのABI
var abi = require('./build/contracts/EthLog.json');

//デプロイしたアドレス
var address = abi.networks['3'].address;
const ethLog = new web3.eth.Contract(abi.abi, address, {});

ethLog.getPastEvents("allEvents", {fromBlock: 0}).then((events) => {
	console.log("past events");
	events.forEach(processEvent);
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

var buf = [];

function send_update(username, text) {

  var key = `${username}___${text}`;
  if (buf.indexOf(key) > -1) { // duplicated
    return;
  }
  buf.push(key);
  while (buf.length > 100) buf.shift();

  var payload = {
    "icon_url": 'https://cdn4.iconfinder.com/data/icons/cryptocoins/227/ETH-512.png',
    "username": `@${username}@ropsten`,
    "text": `${text}`
  };
  send(payload);
}

async function processEvent(event) {
	const sender = event.returnValues[0];
	const body = event.returnValues[1];
	const nickname = await ethLog.methods.getNickname(sender).call();
	const username = web3.utils.hexToUtf8(nickname);
	console.log(`${username}: ${body}`);
	send_update(username, body);
}
