import messageIds from './message-ids';
import {Socket as NetSocket} from 'net';
import {EventEmitter} from 'events';
import parseJSONOnceCompletelyReceived from '../tools/parse-json-once-completely-received';

const defaultOptions = {
  port: 39999,
  host: 'localhost'
};

export default class Socket extends EventEmitter {
  static connect(...args) {
    const socket = new this();

    socket.connect(...args);

    return socket;
  }

  static createConnection(...args) {
    return this.connect(...args);
  }

  constructor() {
    super();

    const socket = new NetSocket();
    socket.setEncoding('utf8');

    for (let evt of ['close', 'connect', 'drain', 'end', 'error', 'lookup',
        'timeout']) {
      socket.on(evt, (...args) => this.emit(evt, ...args));
    }
    socket.on('data', data => {
      const parsed = parseJSONOnceCompletelyReceived.call(this, data);

      if (parsed !== undefined) {
        this.emit('data', parsed);
      }
    });

    this.on('data', function (data) {
      if (data.messageID === messageIds.read) {
        this.emit('ttsScripts', data.scriptStates);
      }
    });

    Object.assign(this, {socket});
  }

  connect(options = {}, connectListener) {
    options = Object.assign({}, defaultOptions, options);
    this.socket.connect(options, connectListener);
  }

  send(id, data = {}) {
    data = Object.assign({}, data, {messageID: id});

    return new Promise(
        (resolve, reject) => this.socket.write(JSON.stringify(data),
        err => err ? reject(err) : resolve()));
  }

  request(id, ...args) {
    return this.send(id, ...args)
      .then(() => {
        return new Promise((resolve, reject) => {
          const listener = data => {
            if (data.messageID === id) {
              resolve(data.scriptStates);
              this.removeListener('data', listener);
            }
          };

          this.on('data', listener);
          this.on('error', reject);
        });
      });
  }

  read() {
    return this.request(messageIds.read);
  }

  write(files) {
    return this.request(messageIds.write, {scriptStates: files});
  }
}

export function connect(...args) {
  return Socket.connect(...args);
}

export function createConnection(...args) {
  return Socket.createConnection(...args);
}
