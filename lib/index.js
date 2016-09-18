import {connect} from './client/connection';
import {obj} from 'through2';
import File from 'vinyl';
import {Minimatch} from 'minimatch';
import writer from 'flush-write-stream';

export function src(globs, {passthrough = false, sourcemaps = false, dot = false, connectionOptions = {}, connection = connect(connectionOptions)} = {}) {
  const mm = new Minimatch(globs);
  const stream = obj();

  function onError(err) {
    stream.emit('error', err);
  }

  connection.on('error', onError);
  connection.read()
    .then(function (files) {
      for (let {name, guid, script} of files) {
        const basename = name
            .replace(/[:\\\/\*\?"<>\|]/g, ' ')
            .replace(/\s+/g, ' ');
        const filename = `${basename}.${guid}.lua`;

        if (mm.match(filename)) {
          stream.write(new File({
            cwd: '/',
            path: `/${filename}`,
            contents: Buffer.from(script, 'utf8'),
            ttsObjectMetadata: {
              name, guid
            }
          }));
        }
      }
    })
    .catch(err => onError(err))
    .then(function () {
      connection.removeListener('error', onError);
      stream.end();
    });

  return stream;
}

export function dest({connectionOptions = {}, connection = connect(connectionOptions)} = {}) {
  const files = [];

  const stream = writer({objectMode: true}, write, flush);

  function write(file, enc, cb) {
    files.push({
      guid: (file.ttsObjectMetadata && file.ttsObjectMetadata.guid) || file.path.split('.').slice(-2, -1)[0],
      script: String(file.contents)
    });

    cb();
  }

  function flush(cb) {
    connection.write(files)
      .then(() => cb());
  }

  return stream;
}
