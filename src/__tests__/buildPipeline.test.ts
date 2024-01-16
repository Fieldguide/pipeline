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
import { PipelineMiddleware, PipelineMiddlewareFactory } from "./../types";

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
  describe("when running a simple pipeline", () => {
    it("should produce a result when successful", async () => {
      const results = await runPipelineForStages(successfulStages);

      expect(results).toEqual({ sum: 10, history: [0, 5, 10] });
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

  describe("when using middleware", () => {
    const testStart = jest.fn();
    const testComplete = jest.fn();
    const testMiddleware: PipelineMiddleware = {
      onStageStart: testStart,
      onStageComplete: testComplete,
    };

    const partialComplete = jest.fn();
    const partialMiddleware: PipelineMiddleware = {
      onStageComplete: partialComplete,
    };

    const factoryStart = jest.fn();
    const middlewareFactory: PipelineMiddlewareFactory = () => ({
      onStageStart: factoryStart,
    });

    beforeEach(() => {
      testStart.mockClear();
      testComplete.mockClear();
      partialComplete.mockClear();
      factoryStart.mockClear();
    });

    it("should run the test middleware", async () => {
      await runPipelineForStages(successfulStages, [testMiddleware]);

      expect(testStart).toHaveBeenCalledTimes(successfulStages.length);
      expect(testComplete).toHaveBeenCalledTimes(successfulStages.length);
    });

    it("should run the partial middleware", async () => {
      await runPipelineForStages(successfulStages, [partialMiddleware]);

      expect(partialComplete).toHaveBeenCalledTimes(successfulStages.length);
    });

    it("should run the middleware factory", async () => {
      await runPipelineForStages(successfulStages, [middlewareFactory]);

      expect(factoryStart).toHaveBeenCalledTimes(successfulStages.length);
    });
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
