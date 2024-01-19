import { PipelineMiddlewareFactory } from "../types";

/**
 * A simple implementation of Pipeline middleware that logs when each stage begins and finishes
 */
export const logStageMiddleware: PipelineMiddlewareFactory = (
  logger: (msg: string) => void = console.log,
) => ({
  onStageStart: ({ metadata, currentStage }) => {
    logger(`[${metadata.name}] starting ${currentStage}...`);
  },
  onStageComplete: ({ metadata, currentStage }) => {
    logger(`[${metadata.name}] ${currentStage} completed`);
  },
});
