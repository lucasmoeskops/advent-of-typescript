import * as fs from 'fs';

type Situation = [Wire, Wire];

type Wire = Array<LineDirective>;

type Line = [Point, Point];

class LineDirective {
    direction: string;
    amount: number;
    constructor(raw: string) {
        this.direction = raw[0];
        this.amount = Number(raw.slice(1));
    }
}

class Point {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    equals(point: Point) {
        return point.x === this.x && point.y === this.y;
    }
}

function readSituation() : Situation {
    const data = fs.readFileSync('./201903.txt', 'utf-8');
    const wires = data.split('\n')
                      .map(wire => wire.split(',')
                                       .map(raw => new LineDirective(raw)));
    return [wires[0], wires[1]];
}

function calculateIntersections(wire1: Wire, wire2: Wire) : Array<Point> {
    function validIntersection(point: Point) {
        return point.x !== 0 || point.y !== 0;
    }
    const lines: Array<Array<Line>> = [
        wireToLines(wire1).map(normalizeLine), 
        wireToLines(wire2).map(normalizeLine),
    ];
    return lines[0].reduce<Array<Point>>((points: Array<Point>, line: Line) => {
        return points.concat(
            lines[1].map(line2 => intersectsAt(line, line2))
                    .filter(validIntersection)
        );
    }, []);
}

/**
 * Returns Point(0, 0) if no intersection occurs.
 */
function intersectsAt(line1: Line, line2: Line) : Point {
    const onNoIntersection = new Point(0, 0);
    const horizontalLine = line1[0].x === line1[1].x ? line2 : line1;
    const verticalLine = line1[0].y === line1[1].y ? line2 : line1;
    if (lineLength(line1) === 0 || lineLength(line2) === 0) {
        return line1[0].equals(line2[0]) ? line1[0] : onNoIntersection;
    }
    if (horizontalLine[0].x <= verticalLine[0].x
        && verticalLine[0].x <= horizontalLine[1].x
        && verticalLine[0].y <= horizontalLine[0].y
        && horizontalLine[0].y <= verticalLine[1].y) {
        return new Point(verticalLine[0].x, horizontalLine[0].y);
    }
    return onNoIntersection;
}

function lineLength(line: Line) : number {
    return Math.abs(line[0].x - line[1].x) + Math.abs(line[0].y - line[1].y);
}

function wireToLines(wire: Wire) : Array<Line> {
    type IntermediateResult = [Array<Line>, Point];
    const locationMap: Record<string, (point: Point, amount: number) => Point> = {
        "U": (point, amount) => new Point(point.x, point.y - amount),
        "R": (point, amount) => new Point(point.x + amount, point.y),
        "D": (point, amount) => new Point(point.x, point.y + amount),
        "L": (point, amount) => new Point(point.x - amount, point.y),
    };
    function converter ([lines, location]:IntermediateResult, ld: LineDirective): IntermediateResult {
        const toLocation = locationMap[ld.direction](location, ld.amount);
        lines.push([location, toLocation]);
        return [lines, toLocation];
    };
    return wire.reduce<IntermediateResult>(converter, [[], new Point(0, 0)])[0];
}

function normalizeLine(line: Line): Line {
    if (line[0].x > line[1].x || line[0].y > line[1].y) {
        return [line[1], line[0]];
    }
    return line;
}

function distanceToPoint(wire: Wire, point: Point): number {
    const distance = -wireToLines(wire).reduce<number>((distance: number, line: Line) => {
        if (distance >= 0) {
            const index = lineIndex(line, point);
            if (index >= 0) {
                return -(distance + index);
            }
            return distance + lineLength(line);
        }
        return distance;
    }, 0);
    if (distance < 0) {
        throw new Error(`Point ${point.x} ${point.y} is not on wire ${wire}.`)
    }
    return distance;
}

// If the point is on the line, return the amount of pixels the point is 
// away from the start of the line, else return -1.
function lineIndex(line: Line, point: Point) {
    const [minX, maxX] = line[0].x < line[1].x ? line : [line[1], line[0]];
    const [minY, maxY] = line[0].y < line[1].y ? line : [line[1], line[0]];
    
    if (minX.x <= point.x
        && point.x <= maxX.x
        && minY.y <= point.y
        && point.y <= maxY.y
        ) {
        return manhattanDistance(point, line[0]);
    }

    return -1;
}

function manhattanDistance(point1: Point, point2: Point): number {
    return Math.abs(point1.x - point2.x) + Math.abs(point1.y - point2.y);
}

const manhattanDistanceZero = (point: Point) => manhattanDistance(new Point(0, 0), point);
const situation = readSituation();
const intersections = calculateIntersections(...situation);
const PartOne = Math.min(...intersections.map(manhattanDistanceZero));
const PartTwo = Math.min(...intersections.map(point => {
    return distanceToPoint(situation[0], point) + distanceToPoint(situation[1], point);
}));

export {PartOne, PartTwo};