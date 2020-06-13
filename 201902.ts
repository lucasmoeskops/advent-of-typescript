import * as fs from 'fs';

import {Program, runner} from './intcode';
import {range} from './utils';

function readProgram() : Program {
    const data = fs.readFileSync('./201902.txt', 'utf-8');
    return data.split(',').map(Number);
}

function setAlarmState(program: Program) : void {
    setNounVerb(program, 12, 2);
}

function setNounVerb(program: Program, noun: number, verb: number) : void {
    program[1] = noun;
    program[2] = verb;
}

const program = readProgram();
setAlarmState(program);
runner(program);
const PartOne = program[0];

function findOutput(program: Program, output: number) : [number, number] {
    const result: [number, number] = [-1, -1];
    range(0, 100).forEach(noun => {
        range(0, 100).forEach(verb => {
            let instance = [...program];
            setNounVerb(instance, noun, verb);
            runner(instance);
            if (instance[0] === output) {
                result[0] = noun;
                result[1] = verb;
            }
        })
    });
    return result;
}

const [noun, verb] = findOutput(readProgram(), 19690720);
const PartTwo = 100 * noun + verb;

export {PartOne, PartTwo};