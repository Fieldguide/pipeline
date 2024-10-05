import { buildPipeline } from "buildPipeline";
import { PipelineError, PipelineRollbackError } from "error";
import { logStageMiddlewareFactory } from "middleware/logStageMiddlewareFactory";
import {
  TestMiddleware,
  TestPipelineArguments,
  TestPipelineContext,
  TestPipelineResults,
  TestStage,
  TestStageWithRollback,
  additionStage,
  errorStage,
  generateStageWithRollback,
  initializer,
  returnHistoryResult,
  returnSumResult,
  testPipelineResultValidator,
} from "../__mocks__/TestPipeline";

const INCREMENT = 5;

const successfulStages: TestStage[] = [
  additionStage,
  additionStage,
  returnSumResult,
  returnHistoryResult,
];

const partialResultsStages: TestStage[] = [additionStage, returnSumResult];

const errorStages: TestStage[] = [errorStage, returnHistoryResult];

const rollback1 = jest.fn();
const rollback2 = jest.fn();

const stagesWithRollback: (TestStage | TestStageWithRollback)[] = [
  additionStage,
  generateStageWithRollback(rollback1),
  generateStageWithRollback(rollback2),
  errorStage,
];

describe("buildPipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when running a simple pipeline", () => {
    it("should produce a result when successful", async () => {
      const results = await runPipelineForStages(successfulStages);

      expect(results).toEqual({ sum: 10, history: [0, 5, 10] });
    });

    it("should throw an error if only partial results are returned", async () => {
      const test = () => runPipelineForStages(partialResultsStages);

      await expect(test).rejects.toThrow(
        "Results from pipeline failed validation",
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
    let middlewareCalls: string[];

    let testMiddleware1: TestMiddlewareMock;
    let testMiddleware2: TestMiddlewareMock;

    beforeEach(async () => {
      middlewareCalls = [];

      const createMiddlewareMock = (name: string): TestMiddlewareMock => {
        return jest.fn(({ currentStage, next }) => {
          middlewareCalls.push(`${currentStage}: ${name}`);

          return next();
        });
      };

      testMiddleware1 = createMiddlewareMock("testMiddleware1");
      testMiddleware2 = createMiddlewareMock("testMiddleware2");

      await runPipelineForStages(successfulStages, [
        logStageMiddlewareFactory(),
        testMiddleware1,
        testMiddleware2,
      ]);
    });

    it(`should run each middleware ${successfulStages.length} times`, () => {
      expect(testMiddleware1).toHaveBeenCalledTimes(successfulStages.length);
      expect(testMiddleware2).toHaveBeenCalledTimes(successfulStages.length);
    });

    it("should run middleware in the correct order", () => {
      expect(middlewareCalls).toEqual([
        "additionStage: testMiddleware1",
        "additionStage: testMiddleware2",
        "additionStage: testMiddleware1",
        "additionStage: testMiddleware2",
        "returnSumResult: testMiddleware1",
        "returnSumResult: testMiddleware2",
        "returnHistoryResult: testMiddleware1",
        "returnHistoryResult: testMiddleware2",
      ]);
    });
  });

  describe("when using a pipeline stage that can rollback", () => {
    let error: unknown;

    describe("and the rollback is successful", () => {
      beforeEach(async () => {
        error = undefined;

        try {
          await runPipelineForStages(stagesWithRollback);
        } catch (e) {
          error = e;
        }
      });

      it("should call configured rollback functions", () => {
        expect(rollback1).toHaveBeenCalledTimes(1);
        expect(rollback2).toHaveBeenCalledTimes(1);
      });

      it("should call the rollbacks in the proper order", () => {
        expect(rollback2.mock.invocationCallOrder[0]).toBeLessThan(
          rollback1.mock.invocationCallOrder[0] ?? 0,
        );
      });

      it("should still throw the error", () => {
        expect(error).toBeInstanceOf(PipelineError);
      });
    });

    describe("and the rollback fails", () => {
      const errorThrownInRollback = new Error("This is a rollback error");

      beforeEach(async () => {
        rollback1.mockImplementation(() => {
          throw errorThrownInRollback;
        });

        error = undefined;

        try {
          await runPipelineForStages(stagesWithRollback);
        } catch (e) {
          error = e;
        }
      });

      it("should run the rollbacks from subsequent stages", () => {
        expect(rollback2).toHaveBeenCalledTimes(1);
      });

      it("should throw a PipelineRollbackError", () => {
        expect(error).toBeInstanceOf(PipelineRollbackError);
      });

      it("should capture the original pipeline error", () => {
        expect(
          (error as PipelineRollbackError<object, object, object>)
            .originalPipelineError.message,
        ).toBe("[TestPipeline] Error: This stage throws an error!");
      });

      it("should capture the original cause that was thrown in the rollback", () => {
        expect(
          (error as PipelineRollbackError<object, object, object>).cause,
        ).toBe(errorThrownInRollback);
      });
    });
  });
});

function runPipelineForStages(
  stages: (TestStage | TestStageWithRollback)[],
  middleware: TestMiddleware[] = [],
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

type TestMiddlewareMock = jest.Mock<
  ReturnType<TestMiddleware>,
  Parameters<TestMiddleware>
>;
