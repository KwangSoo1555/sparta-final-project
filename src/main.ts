import "dotenv/config";
import { AppModule } from "./app.module";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

import { WinstonLogger } from "./modules/utils/winston.util";
import { ExceptionsFilter } from "./filters/exception.filter";

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: WinstonLogger, // replacing logger
  });

  app.useGlobalFilters(new ExceptionsFilter());

  app.enableCors({
    origin: "*", // 모든 도메인에서의 요청을 허용
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Content-Type", "Authorization"], // 허용할 헤더
    credentials: true, // 쿠키와 같은 인증 정보를 허용할지 여부
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("잡일")
    .setDescription("final-project : 일일 잡일 대행 구인 서비스")
    .setVersion("1.0")
    .addServer("api/v1")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침 시에도 JWT 유지하기
      tagsSorter: "alpha", // API 그룹 정렬을 알파벳 순으로
      operationsSorter: "alpha", // API 그룹 내 정렬을 알파벳 순으로
    },
  });

  app.setGlobalPrefix("api/v1");
  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app));

  const configService = app.get(ConfigService);
  const port = configService.get<number>("SERVER_PORT") || 3000;

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }

  try {
    await app.listen(port);
    console.log(`Server is running on: ${port}, Great to see you! 😊`);
  } catch (error) {
    console.error(error);
  }
}
bootstrap();
