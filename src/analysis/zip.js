import { Unzip, UnzipInflate } from "fflate";

/**
 * Stream a zip File entry by entry without holding the whole archive in memory
 * (a Health export.zip can be several hundred MB).
 *
 * `select(name)` returns a handler for entries we care about, or null to skip:
 *   { text(chunk, final) }  — called with decoded text pieces as they inflate.
 */
export async function streamZip(file, select, onProgress) {
  const unzip = new Unzip();
  unzip.register(UnzipInflate);
  const pending = [];
  unzip.onfile = (entry) => {
    const handler = select(entry.name);
    if (!handler) return;
    const decoder = new TextDecoder();
    let done;
    pending.push(new Promise((resolve, reject) => { done = { resolve, reject }; }));
    entry.ondata = (err, chunk, final) => {
      if (err) { done.reject(err); return; }
      handler.text(decoder.decode(chunk, { stream: !final }), final);
      if (final) done.resolve();
    };
    entry.start();
  };
  const reader = file.stream().getReader();
  let read = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    read += value.length;
    unzip.push(value, false);
    onProgress?.(read / file.size);
  }
  unzip.push(new Uint8Array(0), true);
  await Promise.all(pending);
}
