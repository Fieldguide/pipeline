import { PipelineMiddleware } from "../types";

/**
 * A simple implementation of Pipeline middleware that logs the duration of each stage
 */
export const logStageMiddlewareFactory = (
  logger: (msg: string) => void = console.log,
): PipelineMiddleware => {
  return async ({ metadata, currentStage, next }) => {
    const started = performance.now();

    try {
      return await next();
    } finally {
      logger(
        `[${metadata.name}] ${currentStage} completed in ${performance.now() - started}ms`,
      );
    }
  };
};
