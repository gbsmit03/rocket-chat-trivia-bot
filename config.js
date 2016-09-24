var TRIVIA_BOT_CONFIG = {
    CHATROOM: 'bentestzone' //The room the bot will join and run games.
};


/** 
 * DDP_CONFIG_OBJ
 * See https://github.com/oortcloud/node-ddp-client for info
 * */
//SEE 
var DDP_CONFIG = {
    // All properties optional, defaults shown
    host: "demo.rocket.chat",
    //   port : 3000,
    port: 443,
    ssl: true,
    autoReconnect: true,
    autoReconnectTimer: 500,
    maintainCollections: true,
    ddpVersion: "1",  // ["1", "pre2", "pre1"] available,
    // uses the sockJs protocol to create the connection
    // this still uses websockets, but allows to get the benefits
    // from projects like meteorhacks:cluster
    // (load balancing and service discovery)
    // do not use `path` option when you are using useSockJs
    useSockJs: true,
    // Use a full url instead of a set of `host`, `port` and `ssl`
    // do not set `useSockJs` option if `url` is used
    // url: 'wss://example.com/websocket'
};

//TODO Need to do something better with this. Really ugly right now
//This is an example for demo.rocket.chat
var LOGIN_OBJ = {
    user: {
        email: "login email"
    },
    password: {
        digest: "password digest",
        algorithm: "sha-256"
    }
}

module.exports.TRIVIA_BOT_CONFIG = TRIVIA_BOT_CONFIG;
module.exports.DDP_CONFIG = DDP_CONFIG;
module.exports.LOGIN_OBJ = LOGIN_OBJ;