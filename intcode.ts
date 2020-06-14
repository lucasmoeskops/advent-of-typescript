import {range} from './utils';

type Program = Record<number,bigint>;

type Opcode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 99;

type ParameterMode = 0 | 1 | 2;

class Instruction {
    opcode: Opcode;
    modes: ParameterMode[];
    parameters: bigint[];

    constructor(opcode: Opcode, modes: ParameterMode[], parameters: bigint[]) {
        this.opcode = opcode;
        this.modes = modes;
        this.parameters = parameters;
    }
}

enum EffectType {
    INCREMENT,
    MOVE,
    INPUT,
    OUTPUT,
    SET_RELATIVE_BASE,
    TERMINATE,
 };

type Effect = [EffectType, bigint[]];

type InstructionType = (
    program: Program,
    relativeBase: number, 
    userInput: bigint, 
    modes: ParameterMode[], 
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
    99: 0,
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
    1: (program, relativeBase, _, modes, parameters) => {
        const [left, right, target] = [
            ParameterModeSet[modes[0]](program, parameters[0], relativeBase),
            ParameterModeSet[modes[1]](program, parameters[1], relativeBase),
            ParameterModeSet[modes[2]](program, parameters[2], relativeBase, true),
        ];
        program[Number(target)] = left + right;
        return [[EffectType.INCREMENT, []]];
    },
    2: (program, relativeBase, _, modes, parameters) => {
        const [left, right, target] = [
            ParameterModeSet[modes[0]](program, parameters[0], relativeBase),
            ParameterModeSet[modes[1]](program, parameters[1], relativeBase),
            ParameterModeSet[modes[2]](program, parameters[2], relativeBase, true),
        ];
        program[Number(target)] = left * right;
        return [[EffectType.INCREMENT, []]];
    },
    3: (program, relativeBase, userInput, modes, parameters) => {
        const target = ParameterModeSet[modes[0]](
            program,
            parameters[0],
            relativeBase,
            true,
        );
        program[Number(target)] = userInput;
        return [[EffectType.INCREMENT, []]];
    },
    4: (program, relativeBase, _, modes, parameters) => {
        return [
            [EffectType.OUTPUT, [
                ParameterModeSet[modes[0]](program, parameters[0], relativeBase),
            ]],
            [EffectType.INCREMENT, []]
        ];
    },
    5: (program, relativeBase, _, modes, parameters) => {
        const [condition, value] = [
            ParameterModeSet[modes[0]](program, parameters[0], relativeBase),
            ParameterModeSet[modes[1]](program, parameters[1], relativeBase),
        ];
        return condition ?
            [[EffectType.MOVE, [value]]]
            : [[EffectType.INCREMENT, []]];
    },
    6: (program, relativeBase, _, modes, parameters) => {
        const [condition, value] = [
            ParameterModeSet[modes[0]](program, parameters[0], relativeBase),
            ParameterModeSet[modes[1]](program, parameters[1], relativeBase),
        ];
        return !condition ?
            [[EffectType.MOVE, [value]]]
            : [[EffectType.INCREMENT, []]];
    },
    7: (program, relativeBase, _, modes, parameters) => {
        const [left, right, target] = [
            ParameterModeSet[modes[0]](program, parameters[0], relativeBase),
            ParameterModeSet[modes[1]](program, parameters[1], relativeBase),
            ParameterModeSet[modes[2]](program, parameters[2], relativeBase, true),
        ];
        program[Number(target)] = left < right ? 1n : 0n;
        return [[EffectType.INCREMENT, []]];
    },
    8: (program, relativeBase, _, modes, parameters) => {
        const [left, right, target] = [
            ParameterModeSet[modes[0]](program, parameters[0], relativeBase),
            ParameterModeSet[modes[1]](program, parameters[1], relativeBase),
            ParameterModeSet[modes[2]](program, parameters[2], relativeBase, true),
        ];
        program[Number(target)] = left === right ? 1n : 0n;
        return [[EffectType.INCREMENT, []]];
    },
    9: (program, relativeBase, _, modes, parameters) => {
        const value = ParameterModeSet[modes[0]](program, parameters[0], relativeBase);
        return [
            [EffectType.SET_RELATIVE_BASE, [BigInt(relativeBase) + value]],
            [EffectType.INCREMENT, []],
        ];
    },
    99: (_, __, ___, ____) => {
        return [[EffectType.TERMINATE, []]];
    },
};

function parseInstruction(program: Program, address: number) : Instruction {
    const instruction = program[address];
    const opcode = <Opcode>(Number(instruction % 100n));
    const parameters = OpcodeSize[opcode] > 1 ?
        range(
            address + 1,
            address + OpcodeSize[opcode],
        ).map(index => program[index])
        : [];
    type IntermediateResult = [ParameterMode[], number];
    const modes = parameters.reduce<IntermediateResult>(
        (intermediateResult: IntermediateResult, _) => {
            const [modes, modesNumber] = intermediateResult;
            modes.push(<ParameterMode>(modesNumber % 10));
            return [modes, Math.floor(modesNumber / 10)];
        },
        [[], Math.floor(Number(instruction / 100n))]
    )[0];
    return new Instruction(opcode, modes, parameters);
}

function* run(program: Program) : Generator<bigint | null, void, bigint | null> {
    let address: number = 0;
    let currentInput: bigint = 0n;
    let relativeBase: number = 0;
    
    while (true) {
        const instruction: Instruction = parseInstruction(program, address);

        if (instruction.opcode === 3) {
            currentInput = <bigint>(yield null);
        }

        // console.log(instruction);

        const effects = Instructions[instruction.opcode](
            program,
            relativeBase,
            currentInput,
            instruction.modes,
            instruction.parameters,
        );
        
        for (const [effectType, parameters] of effects) {
            if (effectType === EffectType.INCREMENT) {
                address += OpcodeSize[instruction.opcode];
            } else if (effectType === EffectType.MOVE) {
                address = Number(parameters[0]);
            } else if (effectType === EffectType.OUTPUT) {
                yield parameters[0];
            } else if (effectType === EffectType.SET_RELATIVE_BASE) {
                relativeBase = Number(parameters[0]);
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
            const value = outputBuffer.pop();
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