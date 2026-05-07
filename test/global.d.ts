declare global {
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    randomString: (length?: number) => string;
    randomEmail: () => string;
  };
}

export {};