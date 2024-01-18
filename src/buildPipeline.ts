import { compact, merge } from "lodash";
import { PipelineError } from "./error/PipelineError";
import {
  Pipeline,
  PipelineInitializer,
  PipelineMetadata,
  PipelineMiddleware,
  PipelineMiddlewareCallable,
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
    const results: Partial<R> = {};

    /** A context (or undefined) value used for catching/reporting errors */
    let maybeContext: C | undefined = undefined;

    const metadata: PipelineMetadata<A> = {
      name,
      arguments: args,
    };

    try {
      const stageNames = stages.map((s) => s.name);

      const context = await initializer(args);
      maybeContext = context;

      const buildMiddlewarePayload = (
        currentStage: string
      ): PipelineMiddlewarePayload<A, C, R> => ({
        context,
        metadata,
        results,
        stageNames,
        currentStage,
      });

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
      throw new PipelineError(
        `${String(e)}`,
        maybeContext,
        results,
        metadata,
        e
      );
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
  const handlers = compact<PipelineMiddlewareCallable<object, object, object>>(
    middleware.map((m) => {
      if (typeof m === "function") {
        return m()[event];
      } else {
        return m[event];
      }
    })
  );

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
