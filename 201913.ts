import * as fs from 'fs';

import {Program, runner} from './intcode';
import {Point} from './point';
import {HashMap} from './structures';

enum Tile {
    EMPTY = 0,
    WALL = 1,
    BLOCK = 2,
    HORIZONTAL_PADDLE = 3,
    BALL = 4,
};

enum Joystick {
    NEUTRAL = 0,
    TILT_LEFT = -1,
    TILT_RIGHT = 1,
}

function readProgram(): Program {
    const data = fs.readFileSync('./201913.txt', 'utf-8');
    return data.split(',').map(BigInt);
}

function countScreenTiles(program: Program): number {
    const programRunner = runner(program);
    const screen = new HashMap<Tile>(Tile.EMPTY);
    while (true) {
        const [x, y, tile] = programRunner.read(3);

        if (tile !== undefined) {
            screen.set(new Point(Number(x), Number(y)), <Tile>Number(tile));
        } else {
            return screen.values().filter(value => value === Tile.BLOCK).length;
        }
    }
}

function playFree(program: Program): void {
    program[0] = 2n;
}

function scoreAfterBeaten(program: Program): number {
    playFree(program);
    const programRunner = runner(program);
    const screen = new HashMap<Tile>(Tile.EMPTY);
    let blocksLeft = 0;
    let ballX = 0;
    let paddleX = 0;

    while (true) {
        const [x, y, tileOrScore] = programRunner.read(3);

        if (x === -1n) {
            if (blocksLeft === 0) {
                return Number(tileOrScore);
            }
        } else if (tileOrScore === undefined) {
            programRunner.send([BigInt(Math.sign(ballX - paddleX))]);
        } else {
            const point = new Point(Number(x), Number(y));
            const tile = <Tile>Number(tileOrScore);

            if (screen.get(point) === Tile.BLOCK) {
                blocksLeft -= 1;
            } else if (tile === Tile.BLOCK) {
                blocksLeft += 1;
            }

            if (tile === Tile.BALL) {
                ballX = point.x;
            } else if (tile === Tile.HORIZONTAL_PADDLE) {
                paddleX = point.x;
            }

            screen.set(point, tile);
        }
    }
}

const PartOne = countScreenTiles(readProgram());
const PartTwo = scoreAfterBeaten(readProgram());

export {PartOne, PartTwo};