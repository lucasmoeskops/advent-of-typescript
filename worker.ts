import { workerData, parentPort } from 'worker_threads';

async function process() {
    if (parentPort !== null) {
        const start = new Date();
        let partOne, partTwo;
        try {
            const {PartOne, PartTwo} = await import(`./${workerData.path}`);
            [partOne, partTwo] = [PartOne, PartTwo];
        } catch (e) {
            [partOne, partTwo] = ['?', '?'];
        } finally {
            const duration = Math.round(Number(new Date()) - Number(start));
            parentPort.postMessage({ partOne, partTwo, duration });
        }
    }
}

process();

// You can do any heavy stuff here, in a synchronous way
// without blocking the "main thread"
// parentPort.postMessage({ hello: workerData })