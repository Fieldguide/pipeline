import { compact, merge } from "lodash";
import { PipelineError } from "./error/PipelineError";
import {
  Pipeline,
  PipelineInitializer,
  PipelineMetadata,
  PipelineMiddleware,
  PipelineMiddlewareEventType,
  PipelineMiddlewarePayload,
  PipelineResultValidator,
  PipelineStage,
} from "./types";

interface BuildPipelineInput<
  A extends object,
  C extends object,
  R extends object
> {
  name: string;
  initializer: PipelineInitializer<C, A>;
  stages: PipelineStage<A, C, R>[];
  resultsValidator: PipelineResultValidator<R>;
  middleware?: PipelineMiddleware[];
}

/**
 * Generic pipeline constructor that takes in configuration information and returns a method to execute the pipeline
 */
export function buildPipeline<
  A extends object,
  C extends object,
  R extends object
>({
  name,
  initializer,
  stages,
  resultsValidator,
  middleware = [],
}: BuildPipelineInput<A, C, R>): Pipeline<A, R> {
  return async (args) => {
    const stageNames = stages.map((s) => s.name);

    const metadata: PipelineMetadata<A> = {
      name,
      arguments: args,
    };

    const context = await initializer(args);

    const results: Partial<R> = {};

    const buildMiddlewarePayload = (
      currentStage: string
    ): PipelineMiddlewarePayload<A, C, R> => ({
      context,
      metadata,
      results,
      stageNames,
      currentStage,
    });

    try {
      for (const stage of stages) {
        await executeMiddlewareForEvent(
          "onStageStart",
          middleware,
          buildMiddlewarePayload(stage.name)
        );

        const stageResults = await stage(context, metadata);

        // if the stage returns results, merge them onto the results object
        if (stageResults) {
          merge(results, stageResults);
        }

        await executeMiddlewareForEvent(
          "onStageComplete",
          [...middleware].reverse(),
          buildMiddlewarePayload(stage.name)
        );
      }

      if (!isValidResult(results, resultsValidator)) {
        throw new Error("Results from pipeline failed validation");
      }

      return results;
    } catch (e) {
      throw new PipelineError(`${String(e)}`, context, results, metadata, e);
    }
  };
}

async function executeMiddlewareForEvent<
  A extends object,
  C extends object,
  R extends object
>(
  event: PipelineMiddlewareEventType,
  middleware: PipelineMiddleware[],
  payload: PipelineMiddlewarePayload<A, C, R>
) {
  const handlers = compact(middleware.map((m) => m[event]));

  for (const handler of handlers) {
    await handler(payload);
  }
}

/**
 * Wraps the provided validator in a type guard
 */
function isValidResult<R extends object>(
  result: Partial<R>,
  validator: PipelineResultValidator<R>
): result is R {
  return validator(result);
}
