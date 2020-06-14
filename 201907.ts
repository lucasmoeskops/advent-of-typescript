import * as fs from 'fs';

import {Program, runner} from './intcode';
import {combinations, cycle, range0, range} from './utils';

function readProgram(): Program {
    const data = fs.readFileSync('./201907.txt', 'utf-8');
    return data.split(',').map(Number);
}

function findLargestOutputSignal(program: Program): number | void {
    return Math.max(...combinations(range0(5)).map(combination => {
        const amplifiers = range0(5).map(_ => runner([...program]));
        range0(5).forEach(index => {
            amplifiers[index].send([combination[index]]);
        });
        return amplifiers.reduce<number>((input, amplifier) => {
            amplifier.send([input]);
            return <number>amplifier.read();
        }, 0);
    }));
}

function feedbackFindLargestOutputSignal(program: Program): number | void {
    return Math.max(...combinations(range(5, 10)).map(combination => {
        const amplifiers = range0(5).map(_ => runner([...program]));
        range0(5).forEach(index => {
            amplifiers[index].send([combination[index]]);
        });
        const amplifierLoop = cycle(amplifiers);
        let lastResult: number | void = 0;
        while (true) {
            const amplifier = amplifierLoop.next().value;
            amplifier.send([<number>lastResult]);
            const value = amplifier.read();
            if (value === undefined) {
                return <number>lastResult;
            }
            lastResult = value;
        }
    }));
}

const PartOne = findLargestOutputSignal(readProgram());
const PartTwo = feedbackFindLargestOutputSignal(readProgram());

export {PartOne, PartTwo};