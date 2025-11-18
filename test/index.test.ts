import timers from 'node:timers/promises';
import { describe, it, expect } from 'vitest';
import { asyncStringify } from '../src/index.js';

describe('asyncStringify', () => {
    describe('basic functionality', () => {
        it('should stringify a simple object with async replacer', async () => {
            const obj = { name: 'John', age: 30 };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"name":"John","age":30}');
        });

        it('should stringify a simple array with async replacer', async () => {
            const arr = [1, 2, 3];
            const result = await asyncStringify(arr, async (_key, value) => value);
            expect(result).toBe('[1,2,3]');
        });

        it('should stringify primitives', async () => {
            expect(await asyncStringify('hello', async (_key, value) => value)).toBe('"hello"');
            expect(await asyncStringify(42, async (_key, value) => value)).toBe('42');
            expect(await asyncStringify(true, async (_key, value) => value)).toBe('true');
            expect(await asyncStringify(null, async (_key, value) => value)).toBe('null');
        });

        it('should handle undefined', async () => {
            const result = await asyncStringify(undefined, async (_key, value) => value);
            expect(result).toBe(undefined);
        });
    });

    describe('async replacer transformations', () => {
        it('should transform values using async replacer', async () => {
            const obj = { name: 'John', age: 30 };
            const result = await asyncStringify(obj, async (_key, value) => {
                if (typeof value === 'string') {
                    return value.toUpperCase();
                }
                return value;
            });
            expect(result).toBe('{"name":"JOHN","age":30}');
        });

        it('should handle async operations in replacer', async () => {
            const obj = { id: 1, value: 'test' };
            const result = await asyncStringify(obj, async (key, value) => {
                if (key === 'id') {
                    // Simulate async operation
                    await timers.setTimeout(10);
                    return value * 2;
                }
                return value;
            });
            expect(result).toBe('{"id":2,"value":"test"}');
        });

        it('should filter out properties by returning undefined', async () => {
            const obj = { public: 'visible', private: 'hidden', keep: 'this' };
            const result = await asyncStringify(obj, async (key, value) => {
                if (key === 'private') {
                    return undefined;
                }
                return value;
            });
            expect(result).toBe('{"public":"visible","keep":"this"}');
        });
    });

    describe('nested structures', () => {
        it('should handle nested objects', async () => {
            const obj = {
                user: {
                    name: 'John',
                    address: {
                        city: 'NYC',
                        zip: '10001',
                    },
                },
            };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"user":{"name":"John","address":{"city":"NYC","zip":"10001"}}}');
        });

        it('should handle nested arrays', async () => {
            const arr = [
                [1, 2],
                [3, 4],
                [5, 6],
            ];
            const result = await asyncStringify(arr, async (_key, value) => value);
            expect(result).toBe('[[1,2],[3,4],[5,6]]');
        });

        it('should handle mixed nested structures', async () => {
            const obj = {
                users: [
                    { name: 'John', scores: [90, 85] },
                    { name: 'Jane', scores: [95, 88] },
                ],
            };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"users":[{"name":"John","scores":[90,85]},{"name":"Jane","scores":[95,88]}]}');
        });

        it('should transform nested values', async () => {
            const obj = {
                level1: {
                    level2: {
                        value: 'nested',
                    },
                },
            };
            const result = await asyncStringify(obj, async (_key, value) => {
                if (typeof value === 'string') {
                    return value.toUpperCase();
                }
                return value;
            });
            expect(result).toBe('{"level1":{"level2":{"value":"NESTED"}}}');
        });
    });

    describe('spacing parameter', () => {
        it('should format with numeric space', async () => {
            const obj = { name: 'John', age: 30 };
            const result = await asyncStringify(obj, async (_key, value) => value, 2);
            expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
        });

        it('should format with string space', async () => {
            const obj = { x: 1, y: 2 };
            const result = await asyncStringify(obj, async (_key, value) => value, '\t');
            expect(result).toBe('{\n\t"x": 1,\n\t"y": 2\n}');
        });
    });

    describe('context binding', () => {
        it('should call replacer with correct context', async () => {
            const obj = {
                name: 'John',
                nested: {
                    value: 42,
                },
            };

            const contexts: any[] = [];
            await asyncStringify(obj, async function (this: any, key, value) {
                contexts.push({ context: this, key, value });
                return value;
            });

            // Root call should have { '': obj } as context
            expect(contexts[0].key).toBe('');
            expect(contexts[0].value).toBe(obj);

            // Property calls should have parent object as context
            const nameContext = contexts.find((c) => c.key === 'name');
            expect(nameContext?.context).toBe(obj);
        });
    });

    describe('error handling', () => {
        it('should throw TypeError for circular references', async () => {
            const obj: any = { name: 'test' };
            obj.circular = obj;

            await expect(asyncStringify(obj, async (_key, value) => value)).rejects.toThrow(TypeError);
            await expect(asyncStringify(obj, async (_key, value) => value)).rejects.toThrow(
                'Converting circular structure to JSON',
            );
        });

        it('should throw TypeError for BigInt values', async () => {
            const obj = { big: BigInt(123) };

            await expect(asyncStringify(obj, async (_key, value) => value)).rejects.toThrow(TypeError);
            await expect(asyncStringify(obj, async (_key, value) => value)).rejects.toThrow(
                'Do not know how to serialize a BigInt',
            );
        });

        it('should detect circular references in arrays', async () => {
            const arr: any[] = [1, 2];
            arr.push(arr);

            await expect(asyncStringify(arr, async (_key, value) => value)).rejects.toThrow(TypeError);
        });

        it('should detect circular references in nested structures', async () => {
            const obj: any = {
                a: {
                    b: {
                        c: {},
                    },
                },
            };
            obj.a.b.c = obj.a;

            await expect(asyncStringify(obj, async (_key, value) => value)).rejects.toThrow(
                'Converting circular structure to JSON',
            );
        });
    });

    describe('special values', () => {
        it('should handle null values', async () => {
            const obj = { value: null };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"value":null}');
        });

        it('should handle empty objects and arrays', async () => {
            expect(await asyncStringify({}, async (_key, value) => value)).toBe('{}');
            expect(await asyncStringify([], async (_key, value) => value)).toBe('[]');
        });

        it('should omit functions from objects', async () => {
            const obj = {
                name: 'test',
                method: function () {
                    return 'test';
                },
                value: 42,
            };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"name":"test","value":42}');
        });

        it('should handle Date objects', async () => {
            const date = new Date('2024-01-01T00:00:00.000Z');
            const obj = { timestamp: date };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"timestamp":"2024-01-01T00:00:00.000Z"}');
        });

        it('should handle boolean values', async () => {
            const obj = { isActive: true, isDeleted: false };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"isActive":true,"isDeleted":false}');
        });

        it('should handle numeric values including zero and negatives', async () => {
            const obj = { zero: 0, negative: -42, positive: 100, float: 3.14 };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"zero":0,"negative":-42,"positive":100,"float":3.14}');
        });
    });

    describe('edge cases', () => {
        it('should handle objects with numeric keys', async () => {
            const obj: any = { '0': 'zero', '1': 'one', '2': 'two' };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"0":"zero","1":"one","2":"two"}');
        });

        it('should handle sparse arrays', async () => {
            const arr = [1, , 3]; // eslint-disable-line no-sparse-arrays
            const result = await asyncStringify(arr, async (_key, value) => value);
            expect(result).toBe('[1,null,3]');
        });

        it('should handle arrays with non-numeric properties', async () => {
            const arr: any = [1, 2, 3];
            arr.customProp = 'ignored';
            const result = await asyncStringify(arr, async (_key, value) => value);
            expect(result).toBe('[1,2,3]');
        });

        it('should handle objects with symbol keys (ignored)', async () => {
            const sym = Symbol('test');
            const obj: any = { normal: 'value', [sym]: 'ignored' };
            const result = await asyncStringify(obj, async (_key, value) => value);
            expect(result).toBe('{"normal":"value"}');
        });

        it('should handle very deeply nested structures', async () => {
            let deep: any = { value: 'bottom' };
            for (let i = 0; i < 100; i++) {
                deep = { nested: deep };
            }
            const result = await asyncStringify(deep, async (_key, value) => value);
            expect(result).toContain('"value":"bottom"');
        });
    });

    describe('replacer that returns different types', () => {
        it('should handle replacer that converts objects to primitives', async () => {
            const obj = {
                user: { name: 'John', age: 30 },
            };
            const result = await asyncStringify(obj, async (_key, value) => {
                if (_key === 'user' && typeof value === 'object' && value !== null) {
                    return `User: ${value.name}`;
                }
                return value;
            });
            expect(result).toBe('{"user":"User: John"}');
        });

        it('should handle replacer that converts primitives to objects', async () => {
            const obj = { name: 'John' };
            const result = await asyncStringify(obj, async (key, value) => {
                if (key === 'name' && typeof value === 'string') {
                    return { first: value, last: 'Doe' };
                }
                return value;
            });
            expect(result).toBe('{"name":{"first":"John","last":"Doe"}}');
        });

        it('should handle replacer that returns null', async () => {
            const obj = { value: 'test' };
            const result = await asyncStringify(obj, async (_key, value) => {
                if (_key === 'value') {
                    return null;
                }
                return value;
            });
            expect(result).toBe('{"value":null}');
        });
    });

    describe('real-world use cases', () => {
        it('should fetch and embed user data asynchronously', async () => {
            const users = [{ id: 1 }, { id: 2 }];

            const mockFetchUser = async (id: number) => ({
                id,
                name: `User ${id}`,
                email: `user${id}@example.com`,
            });

            const result = await asyncStringify(users, async (_key, value) => {
                if (typeof value === 'object' && value !== null && 'id' in value && !('name' in value)) {
                    return await mockFetchUser(value.id);
                }
                return value;
            });

            expect(result).toBe(
                '[{"id":1,"name":"User 1","email":"user1@example.com"},{"id":2,"name":"User 2","email":"user2@example.com"}]',
            );
        });

        it('should sanitize sensitive data', async () => {
            const obj = {
                username: 'john_doe',
                password: 'secret123',
                apiKey: 'abc-def-ghi',
                email: 'john@example.com',
            };

            const result = await asyncStringify(obj, async (key, value) => {
                if (key === 'password' || key === 'apiKey') {
                    return '[REDACTED]';
                }
                return value;
            });

            expect(result).toBe(
                '{"username":"john_doe","password":"[REDACTED]","apiKey":"[REDACTED]","email":"john@example.com"}',
            );
        });

        it('should resolve promises in data', async () => {
            const data = {
                immediate: 'value',
                deferred: Promise.resolve('resolved'),
            };

            const result = await asyncStringify(data, async (_key, value) => {
                if (value instanceof Promise) {
                    return await value;
                }
                return value;
            });

            expect(result).toBe('{"immediate":"value","deferred":"resolved"}');
        });
    });
});
