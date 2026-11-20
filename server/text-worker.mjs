import { parentPort, workerData } from 'node:worker_threads';
parentPort.postMessage({ characters: workerData.length, words: workerData.trim().split(/\s+/u).length, lines: workerData.split('\n').length });
