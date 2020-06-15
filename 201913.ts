import * as fs from 'fs';

import {Program, runner} from './intcode';

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

class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return [this.x, this.y].join(';');
    }
}

class Screen {
    data: Record<string,Tile>

    constructor() {
        this.data = {};
    }

    getTile(point: Point) {
        const tile = this.data[point.toString()];
        return tile === undefined ? Tile.EMPTY : tile;
    }

    setTile(point: Point, tile: Tile) {
        this.data[point.toString()] = tile;
    }
}

function readProgram(): Program {
    const data = fs.readFileSync('./201913.txt', 'utf-8');
    return data.split(',').map(BigInt);
}

function countScreenTiles(program: Program): number {
    const programRunner = runner(program);
    const screen = new Screen();
    while (true) {
        const x = programRunner.read();
        const y = programRunner.read();
        const tile = programRunner.read();
        if (tile !== undefined) {
            screen.setTile(new Point(Number(x), Number(y)), <Tile>Number(tile));
        } else {
            return Object.values(screen.data)
                         .filter(value => value === Tile.BLOCK)
                         .length;
        }
    }
}

function playFree(program: Program): void {
    program[0] = 2n;
}

function scoreAfterBeaten(program: Program): number {
    playFree(program);
    const programRunner = runner(program);
    const screen = new Screen();
    let score = 0;
    let blocksLeft = 0;
    let ballX = 0;
    let paddleX = 0;

    while (true) {
        const x = programRunner.read();
        const y = programRunner.read();
        const tileOrScore = programRunner.read();

        if (x === -1n) {
            score = Number(tileOrScore);

            if (blocksLeft === 0) {
                return score;
            }
        } else if (tileOrScore === undefined) {
            programRunner.send([BigInt(Math.sign(ballX - paddleX))]);
        } else {
            const point = new Point(Number(x), Number(y));
            const tile = <Tile>Number(tileOrScore);

            if (screen.getTile(point) === Tile.BLOCK) {
                blocksLeft -= 1;
            } else if (tile === Tile.BLOCK) {
                blocksLeft += 1;
            }

            if (tile === Tile.BALL) {
                ballX = point.x;
            } else if (tile === Tile.HORIZONTAL_PADDLE) {
                paddleX = point.x;
            }

            screen.setTile(point, tile);
        }
    }
}

const PartOne = countScreenTiles(readProgram());
const PartTwo = scoreAfterBeaten(readProgram());

export {PartOne, PartTwo};