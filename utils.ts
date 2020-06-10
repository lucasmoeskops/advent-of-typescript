export const range0 = (to: number): Array<number> => [...Array(to).keys()]
export const range = (from: number, to: number): Array<number> => range0(to - from).map(i => i + from);
