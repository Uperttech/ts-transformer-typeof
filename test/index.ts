import { typeOf } from '../index'
import assert from 'assert'

describe('keys', () => {
  it('should return info of given type', () => {
    assert.deepStrictEqual(typeOf(), {})
    assert.deepStrictEqual(typeOf<any>(), {
      decorators: [],
      name: '',
      properties: {}
    })
    interface Foo {
      foo: string
    }

    assert.deepStrictEqual(typeOf<Foo>(), {
      name: "Foo",
      decorators: [],
      properties: {
        foo: {
          type: "string",
          modifiers: {
            optional: false,
            readonly: false
          },
          decorators: []
        }
      }
    })

    type FooBar = {
      readonly foo: string
      bar?: number
    }

    assert.deepStrictEqual(typeOf<FooBar>(), {
      name: "FooBar",
      decorators: [],
      properties: {
        foo: {
          type: "string",
          modifiers: {
            optional: false,
            readonly: true
          },
          decorators: []
        },
        bar: {
          type: "number",
          modifiers: {
            optional: true,
            readonly: false
          },
          decorators: []
        }
      }
    })

    interface BarBaz {
      bar: (x: number) => number;
      baz: bigint;
    }

    assert.deepStrictEqual(typeOf<FooBar & BarBaz>(), {
      name: "",
      decorators: [],
      properties: {
        foo: {
          type: "string",
          modifiers: {
            optional: false,
            readonly: true
          },
          decorators: []
        },
        bar: {
          type: "null",
          modifiers: {
            optional: false,
            readonly: false
          },
          decorators: []
        },
        baz: {
          type: "bigint",
          modifiers: {
            optional: false,
            readonly: false
          },
          decorators: []
        }
      }
    })

    assert.deepStrictEqual(typeOf<FooBar | BarBaz>(), {
      decorators: [],
      name: '',
      properties: {
        bar: {
          decorators: [],
          modifiers: {
            optional: false,
            readonly: false
          },
          type: 'null'
        }
      }
    })

    assert.deepStrictEqual(typeOf<FooBar & any>(), {
      decorators: [],
      name: '',
      properties: {}
    })

    assert.deepStrictEqual(typeOf<FooBar | any>(), {
      decorators: [],
      name: '',
      properties: {}
    })
  })
})
