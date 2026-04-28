export const DataUtils = {
  deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!source || typeof source !== "object") return target;
    if (!target || typeof target !== "object") target = {};

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];

      if (
        sourceValue instanceof Object &&
        !Array.isArray(sourceValue) &&
        target[key] instanceof Object
      ) {
        DataUtils.deepMerge(
          target[key] as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        );
      } else {
        target[key] =
          sourceValue instanceof Object
            ? JSON.parse(JSON.stringify(sourceValue))
            : sourceValue;
      }
    }
    return target;
  },

  deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  },
};
