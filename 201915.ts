import * as fs from 'fs';

import { Program, runner } from './intcode';
import { Point, neighbours } from './point';
import { HashMap } from './structures';
import { zip } from './utils';

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

const DIRECTIONS = [
    MovementCommand.NORTH,
    MovementCommand.EAST,
    MovementCommand.SOUTH,
    MovementCommand.WEST,
];

type Location = [Status, number];

type Situation = [Program, HashMap<Location>, Point];

function readProgram(): Program {
    const data = fs.readFileSync('./201915.txt', 'utf-8');
    return data.split(',').map(BigInt);
}

function explore(program: Program, goal: Goal): Situation | void {
    type Inspection = [Program, MovementCommand | null, Point, number];
    const area = new HashMap<Location>([Status.UNKNOWN, -1]);
    const inspectQueue: Inspection[] = [[program, null, new Point(0, 0), 0]];
    let farthestPoint: Point = new Point(0, 0);
    let maxDistance = 0;

    while (inspectQueue.length) {
        const [program, direction, point, distance] = <Inspection>inspectQueue.shift();
        let status = Status.OK;

        if (direction !== null) {
            const programRunner = runner(program);
            programRunner.send([BigInt(direction)]);
            status = Number(programRunner.read()[0]);
        }

        area.set(point, [status, distance]);

        if (goal === Goal.OXYGEN_SYSTEM && status === Status.AT_OXYGEN_SYSTEM) {
            return [program, area, point];
        } else if (status === Status.OK) {
            if (distance > maxDistance) {
                maxDistance = distance;
                farthestPoint = point;
            }
             
            zip(DIRECTIONS, neighbours(point)).forEach((entry) => {
                const [direction, neighbour] = entry;
                const [status, _] = area.get(neighbour);
                
                if (status === Status.UNKNOWN) {
                    inspectQueue.push([
                        {...program},
                        direction,
                        neighbour,
                        distance + 1,
                    ]);
                }
            })
        }
    }

    if (goal === Goal.MAX_DISTANCE) {
        return [program, area, farthestPoint];
    }
}

let [program, area, point] = <Situation>explore(readProgram(), Goal.OXYGEN_SYSTEM);
const PartOne = area.get(point)[1];
[program, area, point] = <Situation>explore(program, Goal.MAX_DISTANCE);
const PartTwo = area.get(point)[1];

export { PartOne, PartTwo };
