import { ConfigService } from "@nestjs/config";

const configService = new ConfigService();

export const AUTH_CONSTANT = {
  ACCESS_TOKEN_EXPIRES_IN: "1h",
  REFRESH_TOKEN_EXPIRES_IN: "7d",

  HASH_SALT_ROUNDS: 10,

  // 이메일 인증 관련 상수
  AUTH_EMAIL: {
    FROM: configService.get("SMTP_USER"),
    SUBJECT: "인증 관련 메일입니다.",
    HTML: "인증 번호입니다.",
  },
  TEMP_PASSWORD_EMAIL: {
    FROM: configService.get("SMTP_USER"),
    SUBJECT: "임시 비밀번호 관련 메일입니다.",
    HTML: "임시 비밀번호입니다.",
  },
  PASSPORT: {
    COMMON: {
      FAILURE_REDIRECT: "/api/auth/fail",
    },
    NAVER: {
      NAME: "naver",
      OAUTH: "/naver/oauth",
    },
  },
};
