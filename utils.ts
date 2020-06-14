export const combinations = <T>(elements: T[]): T[][] => {
    return range0(elements.length).map(index => {
        const elements2 = [...elements];
        const first = elements2.splice(index, 1)[0];
        return elements2.length ?
            combinations(elements2).map(result => [first].concat(result))
            : [[first]];
    }).reduce((p, n) => p.concat(n), []);
};
export const cycle = function* <T>(elements: T[]): Generator<T, never, null> {
    let index = 0;
    while (true) {
        for (const element of elements) {
            yield element;
        }
    }
};
export const range0 = (to: number): number[] => [...Array(to).keys()]
export const range = (from: number, to: number): number[] => range0(to - from).map(i => i + from);
