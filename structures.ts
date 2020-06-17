export abstract class Hashable {
    abstract hash(): string;

    equals(other: Hashable) {
        return this.hash() == other.hash();
    }
}

export class HashMap<T> {
    data: Record<string,T> = {}
    defaultValue: T;

    constructor(defaultValue: T) {
        this.defaultValue = defaultValue;
    }

    get (key: Hashable) : T {
        const value = this.data[key.hash()];
        return value !== undefined ? value : this.defaultValue;
    }

    has (key: Hashable) {
        return this.data[key.hash()] !== undefined;
    }

    set (key: Hashable, value: T) : void {
        this.data[key.hash()] = value;
    }

    values () : T[] {
        return Object.values(this.data);
    }
}