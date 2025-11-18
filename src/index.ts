/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 * @param value A JavaScript value, usually an object or array, to be converted.
 * @param replacer A function that transforms the results.
 * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
 * @throws {TypeError} If a circular reference or a BigInt value is found.
 */
export async function asyncStringify(
    value: any,
    replacer: (this: any, key: string, value: any) => Promise<any>,
    space?: number | string,
): Promise<string> {
    // Start transformation with empty string as the root key
    const transformedValue = await transform(replacer, { '': value }, '', value, new WeakSet<object>());

    return JSON.stringify(transformedValue, null, space);
}

async function transform(
    replacer: (this: any, key: string, value: any) => Promise<any>,
    parent: any,
    key: string,
    val: any,
    visited: WeakSet<object>,
): Promise<any> {
    // Call the replacer function with the parent as context
    const replaced = await replacer.call(parent, key, val);

    // Check for BigInt
    if (typeof replaced === 'bigint') {
        throw new TypeError('Do not know how to serialize a BigInt');
    }

    // Handle null, undefined, primitives, and functions
    if (
        replaced === null ||
        replaced === undefined ||
        typeof replaced === 'string' ||
        typeof replaced === 'number' ||
        typeof replaced === 'boolean' ||
        typeof replaced === 'function'
    ) {
        return replaced;
    }

    // Handle objects and arrays
    if (typeof replaced === 'object') {
        // Check if object has toJSON method (like Date)
        if (typeof replaced.toJSON === 'function') {
            return replaced.toJSON();
        }

        // Check for circular reference
        if (visited.has(replaced)) {
            throw new TypeError('Converting circular structure to JSON');
        }

        visited.add(replaced);

        try {
            if (Array.isArray(replaced)) {
                // Process array elements
                const result = [];
                for (let i = 0; i < replaced.length; i++) {
                    const transformed = await transform(replacer, replaced, String(i), replaced[i], visited);
                    result.push(transformed);
                }
                return result;
            } else {
                // Process object properties
                const result: any = {};
                for (const k in replaced) {
                    if (Object.prototype.hasOwnProperty.call(replaced, k)) {
                        const transformed = await transform(replacer, replaced, k, replaced[k], visited);
                        result[k] = transformed;
                    }
                }
                return result;
            }
        } finally {
            visited.delete(replaced);
        }
    }

    return replaced;
}
