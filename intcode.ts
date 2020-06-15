import {range} from './utils';

type Program = Record<number,bigint>;

type Opcode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 99;

type ParameterMode = 0 | 1 | 2;

class Instruction {
    opcode: Opcode;
    parameters: bigint[];

    constructor(opcode: Opcode, parameters: bigint[]) {
        this.opcode = opcode;
        this.parameters = parameters;
    }
}

enum EffectType {
    INCREMENT,
    MOVE,
    INPUT,
    OUTPUT,
    ADJUST_RELATIVE_BASE,
    TERMINATE,
 };

type Effect = [EffectType, bigint[]];

type InstructionType = (
    program: Program,
    userInput: bigint, 
    parameters: bigint[],
) => Effect[];

type InstructionSet = Record<Opcode, InstructionType>;

export interface ProgramInterface {
    read (): bigint | void;
    send (input: bigint[]): void;
}

const OpcodeSize: Record<Opcode,number> = {
    1: 4,
    2: 4,
    3: 2,
    4: 2,
    5: 3,
    6: 3,
    7: 4,
    8: 4,
    9: 2,
    99: 1,
}

const OpcodeDoesWrite: Record<Opcode,boolean> = {
    1: true,
    2: true,
    3: true,
    4: false,
    5: false,
    6: false,
    7: true,
    8: true,
    9: false,
    99: false,
}

const ParameterModeSet: Record<
    ParameterMode,
    (program: Program, value: bigint, relativeBase: number, forWrite?: boolean) => bigint
> = {
    0: (program, value, _, forWrite = false) => {
        if (forWrite) {
            return value;
        }
        const target = Number(value);
        return program.hasOwnProperty(target) ? program[target] : 0n;
    },
    1: (_, value, __, ___) => value,
    2: (program, value, relativeBase, forWrite = false) => {
        const target = Number(value) + relativeBase;
        if (forWrite) {
            return BigInt(target);
        }
        return program.hasOwnProperty(target) ? program[target] : 0n;
    },
};

const Instructions: InstructionSet = {
    1: (program, _, parameters) => {
        const [left, right, target] = parameters;
        program[Number(target)] = left + right;
        return [[EffectType.INCREMENT, []]];
    },
    2: (program, _, parameters) => {
        const [left, right, target] = parameters;
        program[Number(target)] = left * right;
        return [[EffectType.INCREMENT, []]];
    },
    3: (program, userInput, parameters) => {
        const [target] = parameters;
        program[Number(target)] = userInput;
        return [[EffectType.INCREMENT, []]];
    },
    4: (_, __, parameters) => {
        return [[EffectType.OUTPUT, parameters], [EffectType.INCREMENT, []]];
    },
    5: (_, __, parameters) => {
        const [condition, value] = parameters;
        return condition ? [[EffectType.MOVE, [value]]] : [[EffectType.INCREMENT, []]];
    },
    6: (_, __, parameters) => {
        const [condition, value] = parameters;
        return !condition ? [[EffectType.MOVE, [value]]] : [[EffectType.INCREMENT, []]];
    },
    7: (program, _, parameters) => {
        const [left, right, target] = parameters;
        program[Number(target)] = left < right ? 1n : 0n;
        return [[EffectType.INCREMENT, []]];
    },
    8: (program, _, parameters) => {
        const [left, right, target] = parameters;
        program[Number(target)] = left === right ? 1n : 0n;
        return [[EffectType.INCREMENT, []]];
    },
    9: (_, __, parameters) => {
        return [
            [EffectType.ADJUST_RELATIVE_BASE, parameters],
            [EffectType.INCREMENT, []],
        ];
    },
    99: (_, __, ___) => {
        return [[EffectType.TERMINATE, []]];
    },
};

function parseInstruction(program: Program, address: number, relativeBase: number) : Instruction {
    const instruction = program[address];
    const opcode = <Opcode>(Number(instruction % 100n));
    const values = OpcodeSize[opcode] > 1 ?
        range(
            address + 1,
            address + OpcodeSize[opcode],
        ).map(index => program[index])
        : [];
    type IntermediateResult = [ParameterMode[], number];
    const modes = values.reduce<IntermediateResult>(
        (intermediateResult: IntermediateResult, _) => {
            const [modes, modesNumber] = intermediateResult;
            modes.push(<ParameterMode>(modesNumber % 10));
            return [modes, Math.floor(modesNumber / 10)];
        },
        [[], Math.floor(Number(instruction / 100n))]
    )[0];
    const writeIndex = OpcodeDoesWrite[opcode] ? OpcodeSize[opcode] - 2 : -1;
    const parameters = range(0, OpcodeSize[opcode] - 1).map(index => {
        return ParameterModeSet[modes[index]](
            program,
            values[index],
            relativeBase,
            index === writeIndex,
        )
    });
    return new Instruction(opcode, parameters);
}

function* run(program: Program) : Generator<bigint | null, void, bigint | null> {
    let address: number = 0;
    let currentInput: bigint = 0n;
    let relativeBase: number = 0;
    let end = 50;
    
    while (true) {
        const instruction: Instruction = parseInstruction(
            program,
            address,
            relativeBase,
        );

        if (instruction.opcode === 3) {
            currentInput = <bigint>(yield null);
        }

        const effects = Instructions[instruction.opcode](
            program,
            currentInput,
            instruction.parameters,
        );
        
        for (const [effectType, parameters] of effects) {
            if (effectType === EffectType.INCREMENT) {
                address += OpcodeSize[instruction.opcode];
            } else if (effectType === EffectType.MOVE) {
                address = Number(parameters[0]);
            } else if (effectType === EffectType.OUTPUT) {
                yield parameters[0];
            } else if (effectType === EffectType.ADJUST_RELATIVE_BASE) {
                relativeBase += Number(parameters[0]);
            } else if (effectType === EffectType.TERMINATE) {
                return;
            }
        }
    }
}

function runner(program: Program): ProgramInterface {
    const programRunner = run(program);
    let result = programRunner.next();
    let outputBuffer: bigint[] = [];
    let inputBuffer: bigint[] = [];

    function process() {
        while (!result.done && (inputBuffer.length || result.value !== null)) {
            if (result.value !== null) {
                outputBuffer.push(result.value);
                result = programRunner.next();
            } else if (inputBuffer.length) {
                result = programRunner.next(<bigint>inputBuffer.shift());
            }
        }
    }

    process();

    return {
        read () {
            const value = outputBuffer.shift();
            process();
            return value;
        },
        send (input) {
            for (const item of input) {
                inputBuffer.push(item);
            }
            process();
        },
    }

}

export {Program, runner};