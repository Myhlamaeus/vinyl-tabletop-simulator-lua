export default function (str) {
  try {
    return JSON.parse(String(str));
  } catch (e) {}
}
