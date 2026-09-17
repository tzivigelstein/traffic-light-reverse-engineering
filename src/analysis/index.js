/**
 * Page-side entry to the analysis: spawns the worker and resolves with the dataset.
 *
 * @param {File} file
 * @param {object} options   See runAnalysis in run.js
 * @param {(event: object) => void} onProgress
 */
export function analyzeInWorker(file, options, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") onProgress?.(data);
      else if (data.type === "done") { worker.terminate(); resolve(data); }
      else if (data.type === "error") { worker.terminate(); reject(new Error(data.message)); }
    };
    worker.onerror = (e) => { worker.terminate(); reject(e.error ?? new Error(e.message)); };
    worker.postMessage({ type: "analyze", file, options });
  });
}
