import {Hashable} from './structures';
import { range0 } from './utils';

export class Point extends Hashable {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
    }

    hash () {
        return [this.x, this.y].join(';');
    }
}

/**
 * Return the 4 adjacent points of a Point, North, East, South, West.
 */
export function neighbours(point: Point) : Point[] {
    return range0(4).map(direction => new Point(
        point.x + Math.round(Math.sin(direction * Math.PI / 2)),
        point.y - Math.round(Math.cos(direction * Math.PI / 2)),
    ));
}