# Data Export Pipeline Use Case

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Summary](#summary)
- [Core Types](#core-types)
- [Initializer](#initializer)
- [Stages](#stages)
- [Results Validator](#results-validator)
- [Build \& Run](#build--run)

## Summary

Imagine a process where the application needs to download and export employee records for a given company. This involves:

1. Querying the database for the list of employees of the given company
2. Downloading a profile document for each employee that is stored on cloud storage (e.g. Amazon S3)
3. Exporting a manifest CSV where each row contains data about an employee and the filename of their profile document
4. Archive the downloaded files and manifest into a single ZIP file
5. Upload the ZIP file to S3
6. Output the URL to the uploaded ZIP file

It is easy to see how the above ordered steps can translate to a pipeline.

## Core Types

The core types (arguments, context, and results) will help shape the various pieces of the pipeline.

```typescript
interface EmployeePipelineArguments {
  /** The company ID to export employee data for **/
  companyId: number;
  /** Whether or not terminated employees should be included in the export **/
  includeTerminatedEmployees: boolean;
}

interface EmployeePipelineContext {
  /** A map of employee ID to their profile filename **/
  employeeFileMap: Map<number, string>;
  /** The data about each employee **/
  employeeData: Employee[];
  /** The local location of the employee list to include in the archive */
  manifestFilename?: string;
  /** The local location of the zip file to upload and make available via a cloud url */
  zipFilename?: string;
}

interface EmployeePipelineResults {
  /** The url to the ZIP file that can be downloaded for this export **/
  zipFileUrl: string;
  /** The number of employees included in the export **/
  employeeCount: number;
}
```

## Initializer

The initializer builds the `context` object that will be used throughout the pipeline.

```typescript
const initializer: PipelineInitializer<
  EmployeePipelineContext,
  EmployeePipelineArguments
> = (args: EmployeePipelineArguments) => {
  /*
    Do whatever operations are required to fetch the employee data and store
    in an `employeeData` variable:

    const employeeData = ...
  */

  return { employeeData, employeeFileMap: new Map<number, string>() };
};
```

## Stages

The stages are each built as independent methods. This means they can be easily unit tested. Variations to this pipelines can be constructed simply by adding, removing, or reordering stages.

```typescript
type EmployeePipelineStage = PipelineStage<
  EmployeePipelineArguments,
  EmployeePipelineContext,
  EmployeePipelineResults
>;
```

```typescript
const getEmployeeCount: EmployeePipelineStage = ({ employeeData }) => {
  // return the employee count to the results object
  return { employeeCount: employeeData.length };
};
```

```typescript
const downloadProfile: EmployeePipelineStage = ({
  employeeFileMap,
  employeeData,
}) => {
  employeeData.forEach((employee) => {
    /*
      Do operations to fetch the employee profile and store the path to the
      local file in `localFilePath`
    */

    employeeFileMap.set(employee.id, localFilePath);
  });
};
```

```typescript
const exportManifest: EmployeePipelineStage = ({
  employeeFileMap,
  employeeData,
  ...context
}) => {
  const data = employeeData.map((employee) => {
    return [
      employee.id,
      employee.name,
      employee.hireDate,
      employeeFileMap.get(employee.id),
    ];
  });

  /*
    Write the data to a CSV file and store the path to the local csv file in
    `filename`
  */

  context.manifestFilename = filename;
};
```

```typescript
const createArchive: EmployeePipelineStage = ({
  manifestFilename,
  employeeFileMap,
  ...context
}) => {
  const files = [manifestFilename, ...employeeFileMap.values()];

  /*
    Do operations to zip the files and store the zip file, the location of
    which is in `zipFile`

    const zipFile = ...
  */

  context.zipFilename = zipFile;
};
```

```typescript
const uploadArchive: EmployeePipelineStage = ({ zipFilename }) => {
  if (!zipFilename) {
    throw new Error("The ZIP archive could not be found");
  }

  /*
    Upload the `zipFilename` file to a cloud provider and store the url in
    `zipFileUrl`

    const zipFileUrl = ...
  */

  return { zipFileUrl };
};
```

## Results Validator

The results validator ensures that a complete result set was returned.

```typescript
const resultsValidator = ({
  zipFileUrl,
  employeeCount,
}: Partial<EmployeePipelineResults>): boolean => {
  return typeof zipFileUrl === "string" && typeof employeeCount === "number";
};
```

## Build & Run

We can now build and run the pipeline.

```typescript
const pipeline = buildPipeline({
  name: "EmployeeExport",
  initializer,
  stages: [getEmployeeCount, downloadProfile, exportManifest, createArchive],
  resultsValidator,
});

void pipeline({ companyId: 2, includeTerminatedEmployees: false });
```
