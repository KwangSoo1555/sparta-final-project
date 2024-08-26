import { utilities as nestWinstonModuleUtilities, WinstonModule } from "nest-winston";
import * as winstonDaily from "winston-daily-rotate-file";
import * as winston from "winston";
import * as appRoot from "app-root-path";

const isProduction = process.env.NODE_ENV === "production";
const logDir = `${appRoot.path}/src/logs`;

const dailyOptions = (level: string) => {
  return {
    level,
    datePattern: "YYYY-MM-DD",
    dirname: logDir,
    filename: `%DATE%.${level}.log`,
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
  };
};

export const WinstonLogger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      level: isProduction ? "info" : "silly",
      format: isProduction
        ? winston.format.simple()
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike("MyApp", {
              colors: true,
              prettyPrint: true,
            }),
          ),
    }),
    new winstonDaily(dailyOptions("info")),
    new winstonDaily(dailyOptions("warn")),
    new winstonDaily(dailyOptions("error")),
  ],
});
