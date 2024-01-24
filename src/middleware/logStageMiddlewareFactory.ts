import { PipelineMiddleware } from "../types";

/**
 * A simple implementation of Pipeline middleware that logs when each stage begins and finishes
 */
export const logStageMiddlewareFactory = (
  logger: (msg: string) => void = console.log,
): PipelineMiddleware => ({
  onStageStart: ({ metadata, currentStage }) => {
    logger(`[${metadata.name}] starting ${currentStage}...`);
  },
  onStageComplete: ({ metadata, currentStage }) => {
    logger(`[${metadata.name}] ${currentStage} completed`);
  },
});
