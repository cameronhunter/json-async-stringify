# `@cameronhunter/json-async-stringify`

[![npm package](https://img.shields.io/npm/v/%40cameronhunter/json-async-stringify?logo=npm)](https://www.npmjs.com/package/@cameronhunter/json-async-stringify)
[![npm downloads](https://img.shields.io/npm/dm/%40cameronhunter/json-async-stringify?logo=npm)](https://www.npmjs.com/package/@cameronhunter/json-async-stringify)
[![main branch status](https://img.shields.io/github/actions/workflow/status/cameronhunter/json-async-stringify/pre-merge.yml?logo=github&label=main)](https://github.com/cameronhunter/json-async-stringify/actions/workflows/pre-merge.yml)

JSON stringify with support for an async replacer function.

## Why?

The standard `JSON.stringify()` accepts a replacer function to transform values before serialization, but it doesn't support async operations. This package provides an `asyncStringify` function that allows you to use an async replacer function, enabling you to perform asynchronous operations like fetching data from APIs, databases, or other async sources during the stringification process.

## Installation

```bash
npm install @cameronhunter/json-async-stringify
```

## Usage

### Async Data Fetching

```typescript
import { asyncStringify } from '@cameronhunter/json-async-stringify';

const userIds = [{ id: 1 }, { id: 2 }, { id: 3 }];

// Fetch full user details for each ID
const json = await asyncStringify(userIds, async (_key, value) => {
    if (typeof value === 'object' && value !== null && 'id' in value && !('name' in value)) {
        // Fetch user details from an API
        const response = await fetch(`https://api.example.com/users/${value.id}`);
        return response.json();
    }
    return value;
});

console.log(json);
// [{"id":1,"name":"Alice","email":"alice@example.com"},{"id":2,"name":"Bob","email":"bob@example.com"},...]
```

### Converting Image URLs to Base64

```typescript
import { asyncStringify } from '@cameronhunter/json-async-stringify';

const product = {
    name: 'Coffee Mug',
    price: 12.99,
    image: 'https://example.com/images/mug.jpg',
    thumbnail: 'https://example.com/images/mug-thumb.jpg',
};

// Convert image URLs to inline base64 data URLs
const json = await asyncStringify(product, async (key, value) => {
    // Check if this looks like an image URL
    if (typeof value === 'string' && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(value)) {
        // Fetch the image
        const response = await fetch(value);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Convert to base64
        const base64 = buffer.toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Return as data URL
        return `data:${contentType};base64,${base64}`;
    }
    return value;
});

console.log(json);
// {"name":"Coffee Mug","price":12.99,"image":"data:image/jpeg;base64,/9j/4AAQ...","thumbnail":"data:image/jpeg;base64,/9j/4AAQ..."}
```

## API

### `asyncStringify(value, replacer, space?)`

Converts a JavaScript value to a JSON string with support for async replacer functions.

#### Parameters

-   **`value`** (`any`): A JavaScript value, usually an object or array, to be converted.

-   **`replacer`** (`(this: any, key: string, value: any) => Promise<any>`): An async function that transforms values before serialization. The function receives:

    -   `key`: The property key (empty string for the root value)
    -   `value`: The property value
    -   `this`: The parent object containing the value

    The function should return a Promise that resolves to the transformed value.

-   **`space`** (`number | string`, optional): Adds indentation, white space, and line break characters to make the output more readable:
    -   If a number, indicates the number of space characters to use (max 10)
    -   If a string, uses that string (or first 10 characters) for indentation

#### Returns

`Promise<string>`: A Promise that resolves to the JSON string representation of the value.

#### Throws

-   **`TypeError`**: If a circular reference is detected in the object structure
-   **`TypeError`**: If a BigInt value is encountered (BigInt values cannot be serialized to JSON)
