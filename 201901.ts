import * as fs from 'fs';

function readMasses() : Array<number> {
    const data = fs.readFileSync('./201901.txt', 'utf-8');
    return data.split('\n').map(Number);
}

function fuelRequired(mass: number) : number {
    return Math.max(0, Math.floor(mass / 3) - 2);
}

function partTwoFuelRequired(mass: number): number {
    const part = fuelRequired(mass);
    return part > 0 ? part + partTwoFuelRequired(part) : 0;
}

const masses: Array<number> = readMasses()
const sum = (ns: Array<number>) : number => ns.reduce((p, n) => p + n);
const PartOne = sum(masses.map(fuelRequired));
const PartTwo = sum(masses.map(partTwoFuelRequired));

export {PartOne, PartTwo};
