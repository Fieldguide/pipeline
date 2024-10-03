import { last, sum } from "lodash";
import type {
  PipelineInitializer,
  PipelineMiddleware,
  PipelineResultValidator,
  PipelineStage,
  PipelineStageWithRollback,
} from "../types";

export interface TestPipelineArguments {
  increment: number;
}

export interface TestPipelineContext {
  sums: number[];
}

export interface TestPipelineResults {
  sum: number;
  history: number[];
}

export type TestStage = PipelineStage<
  TestPipelineArguments,
  TestPipelineContext,
  TestPipelineResults
>;

export type TestStageWithRollback = PipelineStageWithRollback<
  TestPipelineArguments,
  TestPipelineContext,
  TestPipelineResults
>;

export type TestMiddleware = PipelineMiddleware<
  TestPipelineArguments,
  TestPipelineContext,
  TestPipelineResults
>;

export const EXTERNAL_STATE = {
  value: 0,
  // simulate an async request
  updateValue(value: number): Promise<number> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.value = value;
        resolve(this.value);
      }, 1000);
    });
  },
};

/**
 * A stage to set up the test pipeline
 */
export const initializer: PipelineInitializer<TestPipelineContext> = () => {
  return {
    sums: [0],
  };
};

/**
 * The core step in the test pipeline which adds the iterator (can be included more than once)
 */
export const additionStage: TestStage = (context, metadata) => {
  const lastSum = last(context.sums);

  if (lastSum === undefined) {
    throw Error("No previous sum recorded!");
  }

  // store the next sum
  const newSum = lastSum + metadata.arguments.increment;
  context.sums.push(newSum);
};

/**
 * A stage that returns the sum for the result (result part 1)
 */
export const returnSumResult: TestStage = (context) => {
  const lastSum = last(context.sums);

  if (lastSum === undefined) {
    throw Error("No previous sum recorded!");
  }

  return { sum: lastSum };
};

/**
 * The stage that returns the history result (result part 2)
 */
export const returnHistoryResult: TestStage = (context) => {
  return {
    history: context.sums,
  };
};

/**
 * A stage that throws an error
 */
export const errorStage: TestStage = () => {
  throw Error("This stage throws an error!");
};

/**
 * A stage that specifies a rollback function to undo changes
 */
export const stageWithRollback: TestStageWithRollback = {
  execute: async (context, metadata) => {
    context.sums.push(metadata.arguments.increment);
    console.log(`value of sums: ${String(context.sums)}`);
    await EXTERNAL_STATE.updateValue(sum(context.sums));
  },
  rollback: async () => {
    await EXTERNAL_STATE.updateValue(0);
  },
};

/**
 * A results validator for the test pipeline
 */
export const testPipelineResultValidator: PipelineResultValidator<
  TestPipelineResults
> = (results): results is TestPipelineResults => {
  // false if sum is not a number
  if (typeof results.sum !== "number") {
    return false;
  }

  // false if history is not an array
  if (!Array.isArray(results.history)) {
    return false;
  }

  // return true only if all history types are numeric
  return (
    0 ===
    results.history.map((h) => typeof h).filter((t) => t !== "number").length
  );
};
