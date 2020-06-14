type Program = number[];

type Opcode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 99;

type ParameterMode = 0 | 1; // POSITION MODE, IMMEDIATE MODE

class Instruction {
    opcode: Opcode;
    modes: ParameterMode[];
    parameters: number[];

    constructor(opcode: Opcode, modes: ParameterMode[], parameters: number[]) {
        this.opcode = opcode;
        this.modes = modes;
        this.parameters = parameters;
    }
}

enum EffectType { INCREMENT, MOVE, INPUT, OUTPUT, TERMINATE };

type Effect = [EffectType, number[]];

type InstructionType = (program: Program, userInput: number, modes: ParameterMode[], parameters: number[]) => Effect[];

type InstructionSet = Record<Opcode, InstructionType>;

export interface ProgramInterface {
    read (): number | void;
    send (input: number[]): void;
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
    99: 0,
}

const ParameterModeSet: Record<ParameterMode, (program: Program, value: number) => number> = {
    0: (program, value) => program[value],
    1: (program, value) => value,
};

const Instructions: InstructionSet = {
    1: (program, _, modes, parameters) => {
        const [left, right] = [
            ParameterModeSet[modes[0]](program, parameters[0]),
            ParameterModeSet[modes[1]](program, parameters[1]),
        ];
        program[parameters[2]] = left + right;
        return [[EffectType.INCREMENT, []]];
    },
    2: (program, _, modes, parameters) => {
        const [left, right] = [
            ParameterModeSet[modes[0]](program, parameters[0]),
            ParameterModeSet[modes[1]](program, parameters[1]),
        ];
        program[parameters[2]] = left * right;
        return [[EffectType.INCREMENT, []]];
    },
    3: (program, userInput, _, parameters) => {
        program[parameters[0]] = userInput;
        return [[EffectType.INCREMENT, []]];
    },
    4: (program, _, modes, parameters) => {
        return [
            [EffectType.OUTPUT, [ParameterModeSet[modes[0]](program, parameters[0])]],
            [EffectType.INCREMENT, []]
        ];
    },
    5: (program, _, modes, parameters) => {
        const [condition, value] = [
            ParameterModeSet[modes[0]](program, parameters[0]),
            ParameterModeSet[modes[1]](program, parameters[1]),
        ];
        return [condition ? [EffectType.MOVE, [value]] : [EffectType.INCREMENT, []]];
    },
    6: (program, _, modes, parameters) => {
        const [condition, value] = [
            ParameterModeSet[modes[0]](program, parameters[0]),
            ParameterModeSet[modes[1]](program, parameters[1]),
        ];
        return [!condition ? [EffectType.MOVE, [value]] : [EffectType.INCREMENT, []]];
    },
    7: (program, _, modes, parameters) => {
        const [left, right] = [
            ParameterModeSet[modes[0]](program, parameters[0]),
            ParameterModeSet[modes[1]](program, parameters[1]),
        ];
        program[parameters[2]] = left < right ? 1 : 0;
        return [[EffectType.INCREMENT, []]];
    },
    8: (program, _, modes, parameters) => {
        const [left, right] = [
            ParameterModeSet[modes[0]](program, parameters[0]),
            ParameterModeSet[modes[1]](program, parameters[1]),
        ];
        program[parameters[2]] = left === right ? 1 : 0;
        return [[EffectType.INCREMENT, []]];
    },
    99: (_, __, ___, ____) => {
        return [[EffectType.TERMINATE, []]];
    },
};

function parseInstruction(program: Program, address: number) : Instruction {
    const instruction = program[address];
    const opcode = <Opcode>(instruction % 100);
    const parameters = program.slice(address + 1, address + OpcodeSize[opcode]);
    type IntermediateResult = [ParameterMode[], number];
    const modes = parameters.reduce<IntermediateResult>(
        (intermediateResult: IntermediateResult, parameter: number) => {
            const [modes, modesNumber] = intermediateResult;
            modes.push(<ParameterMode>(modesNumber % 10));
            return [modes, Math.floor(modesNumber / 10)];
        },
        [[], Math.floor(instruction / 100)]
    )[0];
    return new Instruction(opcode, modes, parameters);
}

function* run(program: Program) : Generator<number | null, void, number | null> {
    let address: number = 0;
    let currentInput: number = 0;
    
    while (true) {
        const instruction: Instruction = parseInstruction(program, address);

        if (instruction.opcode === 3) {
            currentInput = <number>(yield null);
        }

        const effects = Instructions[instruction.opcode](
            program,
            currentInput,
            instruction.modes,
            instruction.parameters,
        );
        
        for (const [effectType, parameters] of effects) {
            if (effectType === EffectType.INCREMENT) {
                address += OpcodeSize[instruction.opcode];
            } else if (effectType === EffectType.MOVE) {
                address = parameters[0];
            } else if (effectType === EffectType.OUTPUT) {
                yield parameters[0];
            } else if (effectType === EffectType.TERMINATE) {
                return;
            }
        }
    }
}

function runner(program: Program): ProgramInterface {
    const programRunner = run(program);
    let result = programRunner.next();
    let outputBuffer: number[] = [];
    let inputBuffer: number[] = [];

    function process() {
        while (!result.done && (inputBuffer.length || result.value !== null)) {
            if (result.value !== null) {
                outputBuffer.push(result.value);
                result = programRunner.next();
            } else if (inputBuffer.length) {
                result = programRunner.next(<number>inputBuffer.shift());
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