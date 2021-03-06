import * as fs from 'fs';

import {Program, runner} from './intcode';

function readProgram(): Program {
    const data = fs.readFileSync('./201905.txt', 'utf-8');
    return data.split(',').map(BigInt);
}

function testAirConditioner(program: Program): bigint | void {
    const programRunner = runner(program);
    programRunner.send([1n]);
    let finalValue: bigint | void;
    while ((finalValue = programRunner.read()[0]) === 0n) {}
    return finalValue;
}

function testThermalRadiators(program: Program): bigint | void {
    const programRunner = runner(program);
    programRunner.send([5n]);
    return programRunner.read()[0];
}

const PartOne = testAirConditioner(readProgram());
const PartTwo = testThermalRadiators(readProgram());

export {PartOne, PartTwo};