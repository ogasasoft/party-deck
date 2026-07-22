import path from "node:path";
import { writeValidationReport } from "./geo-quality";

const dataDir = path.resolve(process.env.GEO_DATA_DIR ?? process.argv[2] ?? "archive/geo/data");
const outputPath = path.resolve(process.env.GEO_VALIDATION_OUTPUT ?? process.argv[3] ?? "data-generated/mapillary/validation-report.json");

const report = await writeValidationReport(dataDir, outputPath);

console.log(
  JSON.stringify(
    {
      dataDir: path.relative(process.cwd(), dataDir),
      outputPath: path.relative(process.cwd(), outputPath),
      total: report.total,
      valid: report.valid,
      rejected: report.rejected,
      warningCount: report.warningCount,
      regionCounts: report.regionCounts,
      prefectureCounts: report.prefectureCounts
    },
    null,
    2
  )
);
