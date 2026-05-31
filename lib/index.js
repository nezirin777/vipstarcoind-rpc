'use strict';

var http = require('http');
var https = require('https');

function RpcClient(opts) {
  opts = opts || {};
  this.host = opts.host || '127.0.0.1';
  this.port = opts.port || 31915;
  this.user = opts.user || 'user';
  this.pass = opts.pass || 'pass';
  this.protocol = opts.protocol === 'http' ? http : https;
  this.batchedCalls = null;
  this.disableAgent = opts.disableAgent || false;

  var isRejectUnauthorized = typeof opts.rejectUnauthorized !== 'undefined';
  this.rejectUnauthorized = isRejectUnauthorized ? opts.rejectUnauthorized : true;

  if (RpcClient.config.log) {
    this.log = RpcClient.config.log;
  } else {
    this.log = RpcClient.loggers[RpcClient.config.logger || 'normal'];
  }

}

var cl = console.log.bind(console);

var noop = function () { };

RpcClient.loggers = {
  none: { info: noop, warn: noop, err: noop, debug: noop },
  normal: { info: cl, warn: cl, err: cl, debug: noop },
  debug: { info: cl, warn: cl, err: cl, debug: cl }
};

RpcClient.config = {
  logger: 'normal' // none, normal, debug
};

function rpc(request, callback) {

  var self = this;
  request = JSON.stringify(request);

  // FIX: new Buffer() is deprecated since Node.js 6, removed in Node.js 18+
  var auth = Buffer.from(self.user + ':' + self.pass).toString('base64');

  var options = {
    host: self.host,
    path: '/',
    method: 'POST',
    port: self.port,
    rejectUnauthorized: self.rejectUnauthorized,
    agent: self.disableAgent ? false : undefined
  };

  if (self.httpOptions) {
    for (var k in self.httpOptions) {
      options[k] = self.httpOptions[k];
    }
  }

  var called = false;

  var errorMessage = 'VIPSTARCOIN JSON-RPC: ';

  var req = this.protocol.request(options, function (res) {

    var buf = '';
    res.on('data', function (data) {
      buf += data;
    });

    res.on('end', function () {

      if (called) {
        return;
      }
      called = true;

      if (res.statusCode === 401) {
        callback(new Error(errorMessage + 'Connection Rejected: 401 Unnauthorized'));
        return;
      }
      if (res.statusCode === 403) {
        callback(new Error(errorMessage + 'Connection Rejected: 403 Forbidden'));
        return;
      }
      if (res.statusCode === 500 && buf.toString('utf8') === 'Work queue depth exceeded') {
        var exceededError = new Error('VIPSTARCOIN JSON-RPC: ' + buf.toString('utf8'));
        exceededError.code = 429; // Too many requests
        callback(exceededError);
        return;
      }

      var parsedBuf;
      try {
        parsedBuf = JSON.parse(buf);
      } catch (e) {
        self.log.err(e.stack);
        self.log.err(buf);
        self.log.err('HTTP Status code:' + res.statusCode);
        var err = new Error(errorMessage + 'Error Parsing JSON: ' + e.message);
        callback(err);
        return;
      }

      callback(parsedBuf.error, parsedBuf);

    });
  });

  req.on('error', function (e) {
    var err = new Error(errorMessage + 'Request Error: ' + e.message);
    if (!called) {
      called = true;
      callback(err);
    }
  });

  req.setHeader('Content-Length', Buffer.byteLength(request));
  req.setHeader('Content-Type', 'application/json');
  req.setHeader('Authorization', 'Basic ' + auth);
  req.write(request);
  req.end();
}

RpcClient.prototype.batch = function (batchCallback, resultCallback) {
  this.batchedCalls = [];
  batchCallback();
  rpc.call(this, this.batchedCalls, resultCallback);
  this.batchedCalls = null;
};

RpcClient.callspec = {
  // -----------------------------------------------------------------
  // Wallet
  // -----------------------------------------------------------------
  addMultiSigAddress: '',
  backupWallet: '',
  dumpPrivKey: '',
  encryptWallet: '',
  getAccount: '',
  getAccountAddress: 'str',
  getAddressesByAccount: '',
  getBalance: 'str int',
  getNewAddress: '',
  getReceivedByAccount: 'str int',
  getReceivedByAddress: 'str int',
  getTransaction: '',
  getUnconfirmedBalance: '',
  getWalletInfo: '',
  importAddress: 'str str bool',
  importPrivKey: 'str str bool',
  importMulti: 'obj obj',
  importPrunedFunds: 'str str',
  keyPoolRefill: '',
  listAccounts: 'int',
  listAddressGroupings: '',
  listLockUnspent: 'bool',
  listReceivedByAccount: 'int bool',
  listReceivedByAddress: 'int bool',
  listSinceBlock: 'str int',
  listTransactions: 'str int int',
  listUnspent: 'int int',
  listWalletDir: '',
  listWallets: '',
  loadWallet: 'str',
  lockUnspent: '',
  move: 'str str float int str',
  removePrunedFunds: 'str',
  rescanBlockchain: '',
  sendFrom: 'str str float int str str',
  sendMany: 'str obj int str',
  sendToAddress: 'str float str str',
  setAccount: '',
  setHdSeed: '',
  setTxFee: 'float',
  setWalletFlag: 'str bool',
  signMessage: '',
  signMessageWithPrivKey: 'str str',
  unloadWallet: '',
  walletLock: '',
  walletPassPhrase: 'string int',
  walletPassphraseChange: '',
  abandonTransaction: 'str',
  abortRescan: '',
  createWallet: 'str',

  // -----------------------------------------------------------------
  // Raw Transactions
  // -----------------------------------------------------------------
  createRawTransaction: 'obj',
  decodeRawTransaction: '',
  getRawTransaction: 'str int',
  getRawMemPool: '',
  sendRawTransaction: 'str',
  signRawTransaction: '',
  signRawTransactionWithKey: 'str obj',
  signRawTransactionWithWallet: 'str',
  testMemPoolAccept: 'obj',

  // -----------------------------------------------------------------
  // Blockchain / Network
  // -----------------------------------------------------------------
  getBestBlockHash: '',
  getBlock: 'str bool',
  getBlockchainInfo: '',
  getBlockCount: '',
  getBlockHash: 'int',
  getBlockHashes: 'int int',
  getBlockHeader: 'str',
  getBlockNumber: '',
  getBlockStats: 'str',
  getBlockTemplate: '',
  getChainTips: '',
  getConnectionCount: '',
  getDifficulty: '',
  getGenerate: '',
  getHashesPerSec: '',
  getInfo: '',
  getMempoolEntry: 'str',
  getMemoryPool: '',
  getMemPoolInfo: '',
  getMiningInfo: '',
  getNetworkInfo: '',
  getNodeAddresses: '',
  getPeerInfo: '',
  getSpentInfo: 'obj',
  getTxOut: 'str int bool',
  getTxOutSetInfo: '',
  getWork: '',
  getZmqNotifications: '',
  addNode: '',
  getAddedNodeInfo: '',
  invalidateBlock: 'str',
  help: '',
  logging: '',
  prioritiseTransaction: 'str float int',
  saveMemPool: '',
  setGenerate: 'bool int',
  stop: '',
  submitBlock: '',
  uptime: '',
  validateAddress: '',
  getAddressInfo: 'str',
  verifyMessage: '',

  // -----------------------------------------------------------------
  // Address Index (Insight API layer)
  // -----------------------------------------------------------------
  getAddressMempool: 'obj',
  getAddressUtxos: 'obj',
  getAddressBalance: 'obj',
  getAddressDeltas: 'obj',
  getAddressTxids: 'obj',

  // -----------------------------------------------------------------
  // Estimation
  // -----------------------------------------------------------------
  estimateFee: 'int',
  estimatePriority: 'int',
  estimateSmartFee: 'int',

  // -----------------------------------------------------------------
  // Mining
  // -----------------------------------------------------------------
  generate: 'int',

  // -----------------------------------------------------------------
  // Qtum / VIPS smart contract & PoS
  // -----------------------------------------------------------------
  callContract: 'str str str float float',
  createContract: 'str int float str',
  getAccountInfo: 'str',
  getDgpInfo: '',
  getStakingInfo: '',
  getStorage: 'str',
  getSubsidy: 'int',
  getTransactionReceipt: 'str',
  listContracts: 'int int',
  searchLogs: 'int int',
  sendToContract: 'str str float float float str',
  waitForLogs: ''
};

var slice = function (arr, start, end) {
  return Array.prototype.slice.call(arr, start, end);
};

function generateRPCMethods(constructor, apiCalls, rpc) {

  function createRPCMethod(methodName, argMap) {
    return function () {

      var limit = arguments.length - 1;

      if (this.batchedCalls) {
        limit = arguments.length;
      }

      for (var i = 0; i < limit; i++) {
        if (argMap[i]) {
          arguments[i] = argMap[i](arguments[i]);
        }
      }

      if (this.batchedCalls) {
        this.batchedCalls.push({
          jsonrpc: '2.0',
          method: methodName,
          params: slice(arguments),
          id: getRandomId()
        });
      } else {
        rpc.call(this, {
          method: methodName,
          params: slice(arguments, 0, arguments.length - 1),
          id: getRandomId()
        }, arguments[arguments.length - 1]);
      }

    };
  }

  var types = {
    str: function (arg) {
      return arg.toString();
    },
    int: function (arg) {
      return parseFloat(arg);
    },
    float: function (arg) {
      return parseFloat(arg);
    },
    bool: function (arg) {
      return (arg === true || arg == '1' || arg == 'true' || arg.toString().toLowerCase() == 'true');
    },
    obj: function (arg) {
      if (typeof arg === 'string') {
        return JSON.parse(arg);
      }
      return arg;
    }
  };

  for (var k in apiCalls) {
    var spec = apiCalls[k].split(' ');
    for (var i = 0; i < spec.length; i++) {
      if (types[spec[i]]) {
        spec[i] = types[spec[i]];
      } else {
        spec[i] = types.str;
      }
    }
    var methodName = k.toLowerCase();
    constructor.prototype[k] = createRPCMethod(methodName, spec);
    constructor.prototype[methodName] = constructor.prototype[k];
  }

}

function getRandomId() {
  return parseInt(Math.random() * 100000);
}

generateRPCMethods(RpcClient, RpcClient.callspec, rpc);

module.exports = RpcClient;
