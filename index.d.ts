export type Modifiers = {
    readonly: boolean
    optional: boolean
}

type Decorators = Record<string, string[]>

type BasicTypes = "string" | "array" | "number" | "boolean" | "bigint" | "null" | "function"

type TypeProperty<U extends keyof T, T> = {
    type: BasicTypes | TypeInfo<T[U]>
    decorators: Decorators
    modifiers: Modifiers
}

export type TypeInfo<T> = {
    name: string
    decorators: Decorators
    properties: Record<keyof T, TypeProperty<keyof T, T>>
}

export function typeOf<T extends object>(): TypeInfo<T>;

