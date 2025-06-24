/* eslint-disable @typescript-eslint/no-explicit-any */
// types/vitest-import.d.ts
// This is a custom type declaration to workaround the missing 'vitest/import.d.ts' file.
// It will unblock your project by satisfying TypeScript.
// The actual underlying issue of the missing file still persists.

declare module 'vitest/import' {
  // This provides a minimal type so TypeScript stops complaining.
  // If you specifically use functions from 'vitest/import' (like `vi.fn`),
  // and get new type errors, you might need to add their declarations here.
  // For most cases, 'any' will suffice to silence the "cannot find module" error.
  const VitestImport: any;
  export default VitestImport;
}

// TEMPORARY WORKAROUND for 'Position' and 'GeolocationPositionError' not found
// This provides the necessary type declarations if lib="dom" is failing for these specific types.
interface Position {
    readonly coords: {
        readonly latitude: number;
        readonly longitude: number;
        readonly accuracy: number;
        readonly altitude: number | null;
        readonly altitudeAccuracy: number | null;
        readonly heading: number | null;
        readonly speed: number | null;
    };
    readonly timestamp: DOMHighResTimeStamp;
}

interface GeolocationPositionError {
    readonly code: number;
    readonly message: string;
    readonly PERMISSION_DENIED: 1;
    readonly POSITION_UNAVAILABLE: 2;
    readonly TIMEOUT: 3;
}
