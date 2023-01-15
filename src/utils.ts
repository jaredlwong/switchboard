// expands object types one level deep
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// expands object types recursively
export type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

export function filterUndefined<T>(array: Array<T | undefined>): T[] {
  return array.flatMap((e) => (e ? [e] : []));
}

export class DefaultDict<K, V> extends Map<K, V> {
  defaultFactory: () => V;

  constructor(defaultFactory: () => V) {
    super();
    this.defaultFactory = defaultFactory;
  }

  get(name: K): V {
    if (this.has(name)) {
      const value = super.get(name);
      if (value !== undefined) {
        return value;
      }
    }
    const value = this.defaultFactory();
    this.set(name, value);
    return value;
  }
}
