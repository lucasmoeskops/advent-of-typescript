import * as fs from 'fs';

import {range} from './utils';

type Program = number[];

type Opcode = 1 | 2 | 99;

enum EffectType { INCREMENT, TERMINATE };

type Effect = [EffectType, any[]];

type Instruction = (program: Program, address: number) => Effect;

type InstructionSet = Record<Opcode, Instruction>;

const Instructions: InstructionSet = {
    1: (program, address) => {
        const [p, q, r] = program.slice(address + 1, address + 4);
        program[r] = program[p] + program[q];
        return [EffectType.INCREMENT, [4]];
    },
    2: (program, address) => {
        const [p, q, r] = program.slice(address + 1, address + 4);
        program[r] = program[p] * program[q];
        return [EffectType.INCREMENT, [4]];
    },
    99: (program, address) => {
        return [EffectType.TERMINATE, []];
    },
};

function run(program: Program) {
    let address: number = 0;
    let effectType: EffectType | null = null;
    let effectParameters: any[];

    while (effectType !== EffectType.TERMINATE) {
        [effectType, effectParameters] = Instructions[<Opcode>program[address]](
            program,
            address,
        );
        
        if (effectType === EffectType.INCREMENT) {
            address += effectParameters[0];
        }
    }
}

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
run(program);
const PartOne = program[0];

function findOutput(program: Program, output: number) : [number, number] {
    const result: [number, number] = [-1, -1];
    range(0, 100).forEach(noun => {
        range(0, 100).forEach(verb => {
            let instance = [...program];
            setNounVerb(instance, noun, verb);
            run(instance);
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