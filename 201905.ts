import * as fs from 'fs';

import {Program, runner} from './intcode';

function readProgram(): Program {
    const data = fs.readFileSync('./201905.txt', 'utf-8');
    return data.split(',').map(Number);
}

function testAirConditioner(program: Program): number | void {
    const programRunner = runner(program);
    programRunner.send([1]);
    let finalValue: number | void;
    while ((finalValue = programRunner.read()) === 0) {
        break;
    }
    return finalValue;
}

function testThermalRadiators(program: Program): number | void {
    const programRunner = runner(program);
    programRunner.send([5]);
    let finalValue: number | void;
    while ((finalValue = programRunner.read()) === 0) {
        break;
    }
    return finalValue;
}

const PartOne = testAirConditioner(readProgram());
const PartTwo = testThermalRadiators(readProgram());

export {PartOne, PartTwo};