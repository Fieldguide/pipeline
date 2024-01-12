import { noop } from "lodash";
import {
  TestPipelineArguments,
  TestPipelineContext,
  TestPipelineResults,
  TestStage,
  additionStage,
  errorStage,
  initializer,
  returnHistoryResult,
  testPipelineResultValidator,
} from "../__mocks__/TestPipeline";
import { buildPipeline } from "../buildPipeline";
import { PipelineError } from "../error/PipelineError";
import { returnSumResult } from "./../__mocks__/TestPipeline";
import { PipelineMiddleware } from "./../types";

const INCREMENT = 5;

const successfulStages: TestStage[] = [
  additionStage,
  additionStage,
  returnSumResult,
  returnHistoryResult,
];

const partialResultsStages: TestStage[] = [additionStage, returnSumResult];

const errorStages: TestStage[] = [errorStage, returnHistoryResult];

describe("buildPipeline", () => {
  it("should produce a result when successful", async () => {
    const results = await runPipelineForStages(successfulStages);

    expect(results).toEqual({ sum: 10, history: [0, 5, 10] });
  });

  it("should run any specified middleware", async () => {
    const testMiddleware: PipelineMiddleware = {
      onStageStart: jest.fn(noop),
      onStageComplete: jest.fn(noop),
    };

    const partialMiddleware: PipelineMiddleware = {
      onStageComplete: jest.fn(noop),
    };

    await runPipelineForStages(successfulStages, [
      testMiddleware,
      partialMiddleware,
    ]);

    expect(testMiddleware.onStageStart).toHaveBeenCalledTimes(
      successfulStages.length
    );
    expect(testMiddleware.onStageComplete).toHaveBeenCalledTimes(
      successfulStages.length
    );
    expect(partialMiddleware.onStageComplete).toHaveBeenCalledTimes(
      successfulStages.length
    );
  });

  it("should throw an error if only partial results are returned", async () => {
    const test = () => runPipelineForStages(partialResultsStages);

    await expect(test).rejects.toThrow(
      "Results from pipeline failed validation"
    );
    await expect(test).rejects.toThrow(PipelineError);
  });

  it("should throw an error if a stage throws an error", async () => {
    const test = () => runPipelineForStages(errorStages);

    await expect(test).rejects.toThrow("This stage throws an error!");
    await expect(test).rejects.toThrow(PipelineError);
  });
});

function runPipelineForStages(
  stages: TestStage[],
  middleware: PipelineMiddleware[] = []
) {
  const pipeline = buildPipeline<
    TestPipelineArguments,
    TestPipelineContext,
    TestPipelineResults
  >({
    name: "TestPipeline",
    initializer,
    stages,
    resultsValidator: testPipelineResultValidator,
    middleware,
  });

  return pipeline({ increment: INCREMENT });
}
