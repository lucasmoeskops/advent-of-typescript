import * as fs from 'fs';

import {Program, runner} from './intcode';

function readProgram(): Program {
    const data = fs.readFileSync('./201909.txt', 'utf-8');
    return data.split(',').map(BigInt);
}

function getBoostKeycode(program: Program): bigint | void {
    const programRunner = runner(program);
    programRunner.send([1n]);
    return programRunner.read();
}

function getDistressSignalCoordinates(program: Program): bigint | void {
    const programRunner = runner(program);
    programRunner.send([2n]);
    return programRunner.read();
}

const PartOne = getBoostKeycode(readProgram());
const PartTwo = getDistressSignalCoordinates(readProgram());

export {PartOne, PartTwo};