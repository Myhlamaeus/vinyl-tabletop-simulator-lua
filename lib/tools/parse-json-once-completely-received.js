import parseJSONIfValid from './parse-json-if-valid';

const privates = new WeakMap();
export default function (str) {
  if (!privates.has(this)) {
    privates.set(this, {cache: ''});
  }

  const ownPrivates = privates.get(this);
  const parsed = parseJSONIfValid(ownPrivates.cache + str);

  if (parsed === undefined) {
    ownPrivates.cache += str;
  } else {
    ownPrivates.cache = '';
  }
  return parsed;
}
