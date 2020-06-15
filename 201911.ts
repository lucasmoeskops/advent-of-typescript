import * as fs from 'fs';

import {Program, runner} from './intcode';
import { range } from './utils';

type Color = 0 | 1;

type Direction = 0 | 1 | 2 | 3;

type DirectionCommand = 0 | 1;

class Point {
    x: number = 0;
    y: number = 0;
    constructor(x: number, y: number) {
        this.adjust(x, y);
    }
    adjust(x: number, y: number) {
        this.x += x;
        this.y += y;
    }
    delta(point: Point) {
        return Math.abs(point.x - this.x) + Math.abs(point.y - this.y);
    }
    toString() {
        return [this.x, this.y].join(';');
    }
}

class Robot {
    point: Point;
    direction: Direction;
    constructor() {
        this.point = new Point(0, 0);
        this.direction = 0;
    }
    applyDirectionCommand(command: DirectionCommand) {
        const relValue = command === 0 ? 3 : 1;
        this.direction = <Direction>((this.direction + relValue) % 4);
        this.point.adjust(
            Math.round(Math.sin(this.direction * Math.PI / 2)),
            -Math.round(Math.cos(this.direction * Math.PI / 2)),
        )
    }
}

class Area {
    fillData: Record<string,Color>;
    hasData: boolean = false;
    minX: number = 0;
    maxX: number = 0;
    minY: number = 0;
    maxY: number = 0;

    constructor() {
        this.fillData = {};
    }

    getColor(point: Point): Color {
        return this.fillData[point.toString()] ? 1 : 0;
    }

    setColor(point: Point, color: Color): void {
        if (!this.hasData) {
            this.hasData = true;
            this.minX = this.maxX = point.x;
            this.minY = this.maxY = point.y;
        } else {
            if (point.x < this.minX) {
                this.minX = point.x;
            } else if (point.x > this.maxX) {
                this.maxX = point.x;
            }
            if (point.y < this.minY) {
                this.minY = point.y;
            } else if (point.y > this.maxY) {
                this.maxY = point.y;
            }
        }
        this.fillData[point.toString()] = color;
    }

    equals(area: Area): boolean {
        if (
            this.minX === area.minX && this.minY === area.minY
            && this.maxX === area.maxX && this.maxY === area.maxY
        ) {
            for (const row of range(this.minY, this.maxY)) {
                for (const col of range(this.minX, this.maxX)) {
                    const point = new Point(col, row);

                    if (this.getColor(point) !== area.getColor(point)) {
                        return false;
                    }
                }
            }
            return true;
        }

        return false;
    }

    invert() {
        range(this.minY, this.maxY + 1).forEach(row => {
            range(this.minX, this.maxX + 1).forEach(col => {
                const point = new Point(col, row);
                this.setColor(point, <Color>((this.getColor(point) + 1) % 2));
            });
        });
    }

    mirrorVertical() {
        const area = new Area();
        range(this.minY, this.maxY + 1).forEach(row => {
            range(this.minX, this.maxX + 1).forEach(col => {
                const point = new Point(col, row);
                area.setColor(
                    new Point(this.maxX + this.minX - col, row),
                    this.getColor(point),
                );
            });
        });
        return area;
    }

    print() {
        console.log(range(this.minY, this.maxY + 1).map(row => {
            return range(this.minX, this.maxX + 1).map(col => {
                return this.fillData[new Point(col, row).toString()] ? '#' : '.';
            }).join('');
        }).join('\n'));
    }
}

class Tail {
    direction: Direction;
    position: Point;

    constructor(direction: Direction, position: Point) {
        this.direction = direction;
        this.position = position;
    }
}

function readProgram(): Program {
    const data = fs.readFileSync('./201911.txt', 'utf-8');
    return data.split(',').map(BigInt);
}

function countPaintedPanels(program: Program): number {
    const robot = new Robot();
    const area = new Area();
    const brain = runner(program);
    while (true) {
        brain.send([BigInt(area.getColor(robot.point))]);
        const color = brain.read();
        const direction = brain.read();
        if (color === undefined || direction === undefined) {
            return Object.keys(area.fillData).length;
        }
        area.setColor(robot.point, <Color>Number(color));
        robot.applyDirectionCommand(<DirectionCommand>Number(direction));
    }
}

function printIdentifier(program: Program): string {
    const robot = new Robot();
    const area = new Area();
    area.setColor(new Point(0, 0), 1);
    const brain = runner(program);
    while (true) {
        brain.send([BigInt(area.getColor(robot.point))]);
        const color = brain.read();
        const direction = brain.read();
        if (color === undefined || direction === undefined) {
            return readArea(area);
        }
        area.setColor(robot.point, <Color>Number(color));
        robot.applyDirectionCommand(<DirectionCommand>Number(direction));
    }
}

function readArea(area: Area): string {
    // Actually converting the area to string for funz
    // Finding it out based on speculation and a few characters
    const objects = findObjects(area);
    return objects.map(object => {
        const cycles = countCycles(object);
        const tails = findTails(object);
        const area = new Area();
        object.forEach(point => area.setColor(point, 1));
        if (cycles === 0) {
            if (tails.length === 2) {
                if (area.equals(area.mirrorVertical())) {
                    if (tails.every(tail => tail.direction === 2)) {
                        return 'M';
                    }
                    // U, V, W -- Not really enough example data available
                    // to distinguish them now.
                    return '(UVW)';
                }
                if (tails.some(tail => tail.direction === 0)) {
                    if (tails.some(tail => tail.direction === 2)) {
                        return 'N';
                    }
                    return 'L';
                } else if (tails.some(tail => tail.direction === 1)) {
                    return 'Z';
                } else if (tails.every(tail => Math.floor(tail.direction) === 3)) {
                    return 'J';
                } else if (!tails.some(tail => Math.floor(tail.direction) === 3)) {
                    return 'C';
                } else if (tails.some(tail => tail.position.x === area.minX)) {
                    return 'S';
                }
                return 'G';
            } else if (tails.length === 3) {
                if (area.equals(area.mirrorVertical())) {
                    if (tails.some(tail => tail.direction === 1)) {
                        return 'T';
                    }
                    return 'Y'
                }
                if (tails.some(tail => tail.direction === 2)) {
                    return 'F';
                }
                return 'E';
            } else {
                if (area.equals(area.mirrorVertical())) {
                    if (tails.some(tail => tail.direction === 0)) {
                        return 'H';
                    } else if (tails.some(tail => tail.direction === 1)) {
                        return 'I';
                    }
                    return 'X';
                }
                return 'K';
            }
        } else if (cycles === 1) {
            if (tails.length === 0) {
                if (area.equals(area.mirrorVertical())) {
                    return 'O';
                }
                return 'D';
            } else if (tails.length === 1) {
                if (tails.some(tail => tail.direction === 2)) {
                    return 'P';
                }
                return 'Q';
            } else {
                if (area.equals(area.mirrorVertical())) {
                    return 'A';
                }
                return 'R';
            }
        } else {
            return 'B';
        }
    }).join('');
}

function findObjects(area: Area, allowDiagonal: boolean = true) {
    const canonicalObjects: Record<string,number> = {};
    let objectCounter: number = 0;
    const recheck: Point[] = [];
    const neighbourDeltas: Point[] = [];

    function updatePoint(point: Point) {
        let assignedValue: number | null = null;
        let neighbours: Point[] = [];
        neighbourDeltas.forEach(deltaPoint => {
            const neighbour = new Point(point.x + deltaPoint.x, point.y + deltaPoint.y);
            const value = canonicalObjects[neighbour.toString()];
            if (value !== undefined) {
                neighbours.push(neighbour);

                if (assignedValue === null) {
                    assignedValue = value;
                } else {
                    assignedValue = Math.min(<number>assignedValue, value);
                }
            }
        })
        canonicalObjects[point.toString()] = assignedValue !== null ?
            assignedValue
            : objectCounter++;
        
        neighbours.forEach(neighbour => {
            if (canonicalObjects[neighbour.toString()] > <number>assignedValue) {
                recheck.push(neighbour);
            }
        });
    }

    // Determine neighbour positions
    range(-1, 2).forEach(row => {
        range(-1, 2).forEach(col => {
            if (allowDiagonal || row * col === 0) {
                neighbourDeltas.push(new Point(col, row));
            }
        });
    });

    // Check each point at least once
    range(area.minY, area.maxY + 1).forEach(row => {
        range(area.minX, area.maxX + 1).forEach(col => {
            const point = new Point(col, row);
            if (area.getColor(point) === 1) {
                updatePoint(point);
            }
        });
    });

    // Merge objects
    while (recheck.length) {
        updatePoint(<Point>recheck.pop());
    }

    let finalObjectCounter: number = 0;
    let objects: Point[][] = [];
    let objectMap: Record<number,number> = {};

    // Normalize objects
    range(area.minY, area.maxY + 1).forEach(row => {
        range(area.minX, area.maxX + 1).forEach(col => {
            const point = new Point(col, row);
            const value = canonicalObjects[point.toString()];
            if (value !== undefined) {
                if (!objectMap.hasOwnProperty(value)) {
                    objectMap[value] = finalObjectCounter++;
                    objects[objectMap[value]] = [];
                }
                objects[objectMap[value]].push(point);
            }
        });
    });

    return objects;
}

function findTails(object: Point[]): Tail[] {
    const tails: Tail[] = [];
    const area = new Area();
    object.forEach(point => area.setColor(point, 1));
    object.forEach(point => {
        let neighbours: Point[] = [];
        range(-1, 2).forEach(deltaY => {
            range(-1, 2).forEach(deltaX => {
                if (deltaX === 0 && deltaY === 0) {
                    return;
                }

                if (area.getColor(new Point(point.x + deltaX, point.y + deltaY))) {
                    neighbours.push(new Point(deltaX, deltaY));
                }
            });
        });
        if (neighbours.length === 1
            || neighbours.length === 2 && neighbours[0].delta(neighbours[1]) === 1) {
            const averageX = neighbours.reduce<number>((acc, point) => acc + point.x, 0);
            const averageY = neighbours.reduce<number>((acc, point) => acc + point.y, 0);
            tails.push(new Tail(
                <Direction>((Math.atan2(averageY, averageX) / Math.PI * 2 + 3) % 4),
                point,
            ));
        }
    });
    return tails;
}

function countCycles(object: Point[]) {
    const cycles = [];
    const area = new Area();
    object.forEach(point => area.setColor(point, 1));
    area.setColor(new Point(area.minX - 1, area.minY - 1), 0);
    area.setColor(new Point(area.maxX + 1, area.maxY + 1), 0);
    area.invert();
    return findObjects(area, false).length - 1;
}

const PartOne = countPaintedPanels(readProgram());
const PartTwo = printIdentifier(readProgram());

export {PartOne, PartTwo};
