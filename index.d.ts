export type Modifiers = {
    readonly: boolean
    optional: boolean
}

type Decorator = {
    name: string
    arguments: any[]
}

type BasicTypes = "string" | "array" | "number" | "boolean" | "bigint" | "null" | "function"

type TypeProperty<U extends keyof T, T> = {
    type: BasicTypes | TypeInfo<T[U]>
    decorators: Decorator[]
    modifiers: Modifiers
}

export type TypeInfo<T> = {
    name: string
    decorators: Decorator[]
    properties: Record<keyof T, TypeProperty<keyof T, T>>
}

export function typeOf<T extends object>(): TypeInfo<T>;

