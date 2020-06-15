import {range} from './utils';
import { runService } from './parallel';

type RunnerResult = 'partOne' | 'partTwo' | 'duration';

function humanizeMilliseconds(ms: number): string {
    if (ms < 1000) {
        return ms + 'ms';
    }
    return (Math.round(ms / 100) / 10) + 's';
}

function show(lines: string[]) {
    console.clear();

    for (const line of lines) {
        console.log(line);
    }
}

const values = range(0, 25).map(_ => '');
range(1, 26).forEach(async (i:number) => {
    const pad = (char: string) => i.toString().padStart(2, char);
    try {
        const data = <Record<RunnerResult,string>>await runService({ path: `./2019${pad('0')}` });
        values[i - 1] = `2019 ${pad(' ')}: ${data.partOne}, ${data.partTwo} (${humanizeMilliseconds(Number(data.duration))}})`;
    } catch (e) {}
    show(values);
});
