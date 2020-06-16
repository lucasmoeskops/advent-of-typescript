import * as fs from 'fs';

import {Program, runner} from './intcode';

enum MovementCommand {
    NORTH = 1,
    SOUTH = 2,
    WEST = 3,
    EAST = 4,
}

enum Status {
    UNKNOWN = -1,
    WALL = 0,
    OK = 1,
    AT_OXYGEN_SYSTEM = 2,
}

enum Goal {
    OXYGEN_SYSTEM = 1,
    MAX_DISTANCE = 2,
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

class Area {
    data: Record<string,[Status,number]> = {}

    getLocation(point: Point): [Status, number] {
        const location = this.data[point.toString()];
        return location === undefined ? [Status.UNKNOWN, -1] : location;
    }

    setLocation(point: Point, status: Status, distance: number) {
        this.data[point.toString()] = [status, distance];
    }
}

const DIRECTIONS = [
    MovementCommand.NORTH,
    MovementCommand.EAST,
    MovementCommand.SOUTH,
    MovementCommand.WEST,
];

type Situation = [Program, Area, Point];

function readProgram(): Program {
    const data = fs.readFileSync('./201915.txt', 'utf-8');
    return data.split(',').map(BigInt);
}

function explore(program: Program, goal: Goal): Situation | void {
    type Inspection = [Program, MovementCommand | null, Point, number];
    const area = new Area();
    const inspectQueue: Inspection[] = [[program, null, new Point(0, 0), 0]];
    let farthestPoint: Point = new Point(0, 0);
    let maxDistance = 0;

    while (inspectQueue.length) {
        const [program, direction, point, distance] = <Inspection>inspectQueue.shift();
        const programRunner = runner(program);
        let status = Status.OK;

        if (direction !== null) {
            programRunner.send([BigInt(direction)]);
            status = Number(programRunner.read()[0]);
        }

        area.setLocation(point, status, distance);

        if (goal === Goal.OXYGEN_SYSTEM && status === Status.AT_OXYGEN_SYSTEM) {
            return [program, area, point];
        } else if (status === Status.OK) {
            if (distance > maxDistance) {
                maxDistance = distance;
                farthestPoint = point;
            }
             
            DIRECTIONS.forEach((direction, index) => {
                const neighbour = new Point(
                    point.x + Math.round(Math.sin(index * Math.PI / 2)),
                    point.y - Math.round(Math.cos(index * Math.PI / 2)),
                );
                const [status, _] = area.getLocation(neighbour);
                
                if (status === Status.UNKNOWN) {
                    inspectQueue.push([{...program}, direction, neighbour, distance + 1]);
                }
            })
        }
    }

    if (goal === Goal.MAX_DISTANCE) {
        return [program, area, farthestPoint];
    }
}

let [program, area, point] = <Situation>explore(readProgram(), Goal.OXYGEN_SYSTEM);
const PartOne = area.getLocation(point)[1];
[program, area, point] = <Situation>explore(program, Goal.MAX_DISTANCE);
const PartTwo = area.getLocation(point)[1];

export { PartOne, PartTwo };