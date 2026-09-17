import { runAnalysis } from "./run.js";

/** Web Worker entry: runs the whole analysis off the main thread. */
self.onmessage = async ({ data }) => {
  if (data.type !== "analyze") return;
  try {
    const result = await runAnalysis(data.file, data.options, (event) => self.postMessage({ type: "progress", ...event }));
    self.postMessage({ type: "done", ...result });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err?.message ?? err) });
  }
};
