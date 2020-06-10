import {range} from './utils';


range(1, 26).map(async (i:number) => {
    const pad = (char: string) => i.toString().padStart(2, char);
    try {
        const {PartOne, PartTwo} = await import(`./2019${pad('0')}`);
        console.log(`2019 ${pad(' ')}: ${PartOne}, ${PartTwo}`);
    } catch (e) {
        console.log(`2019 ${pad(' ')}: ?`);
    }
});
