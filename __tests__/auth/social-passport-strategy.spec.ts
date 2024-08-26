import { Test, TestingModule } from "@nestjs/testing";
import { createMock, DeepMocked } from "@golevelup/ts-jest";

import { ConfigService } from "@nestjs/config";
import { AuthService } from "../../src/modules/auth/auth.service";

import {
  GooglePassportStrategy,
  NaverPassportStrategy,
  KakaoPassportStrategy,
} from "../../src/modules/auth/strategies/social-strategy";
import { Profile as GoogleProfile } from "passport-google-oauth20";
import { Profile as NaverProfile } from "passport-naver-v2";
import { Profile as KakaoProfile } from "passport-kakao";

import { SocialProviders } from "../../src/common/customs/enums/enum-social-providers";

describe("Social Login Strategies", () => {
  let module: TestingModule;
  let configService: DeepMocked<ConfigService>;
  let authService: DeepMocked<AuthService>;
  let googleStrategy: GooglePassportStrategy;
  let naverStrategy: NaverPassportStrategy;
  let kakaoStrategy: KakaoPassportStrategy;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [GooglePassportStrategy, NaverPassportStrategy, KakaoPassportStrategy],
    })
      .useMocker(createMock)
      .compile();

    googleStrategy = module.get<GooglePassportStrategy>(GooglePassportStrategy);
    naverStrategy = module.get<NaverPassportStrategy>(NaverPassportStrategy);
    kakaoStrategy = module.get<KakaoPassportStrategy>(KakaoPassportStrategy);
    configService = module.get(ConfigService);
    authService = module.get(AuthService);

    configService.get.mockImplementation((key: string) => {
      const config = {
        GOOGLE_CLIENT_ID: "test_google_client_id",
        GOOGLE_CLIENT_SECRET: "test_google_client_secret",
        GOOGLE_CALLBACK_URL: "http://localhost:3000/auth/google/callback",
        NAVER_CLIENT_ID: "test_naver_client_id",
        NAVER_CLIENT_SECRET: "test_naver_client_secret",
        NAVER_CALLBACK_URL: "http://localhost:3000/auth/naver/callback",
        KAKAO_CLIENT_ID: "test_kakao_client_id",
        KAKAO_CALLBACK_URL: "http://localhost:3000/auth/kakao/callback",
      };
      return config[key];
    });
  });

  describe("GooglePassportStrategy", () => {
    const mockProfile = {
      id: "123456",
      name: { familyName: "Doe", givenName: "John" },
      emails: [{ value: "johndoe@example.com" }],
      provider: "google",
    };

    it("구글 프로필 검증 성공", async () => {
      const done = jest.fn();

      await googleStrategy.validate(
        "accessToken",
        "refreshToken",
        mockProfile as GoogleProfile,
        done,
      );

      expect(done).toHaveBeenCalledWith(null, {
        email: "johndoe@example.com",
        provider: "google",
        socialId: "123456",
        name: "DoeJohn",
      });
    });

    it("구글 프로필 검증 실패", async () => {
      const done = jest.fn();
      const error = new Error("Validation failed");

      jest
        .spyOn(googleStrategy, "validate")
        .mockImplementation(async (accessToken, refreshToken, profile, done) => {
          done(error, null);
        });

      await googleStrategy.validate(
        "accessToken",
        "refreshToken",
        mockProfile as GoogleProfile,
        done,
      );

      expect(done).toHaveBeenCalledWith(error, null);
    });
  });

  describe("NaverPassportStrategy", () => {
    const mockProfile = {
      id: "123456",
      name: "John Doe",
      email: "johndoe@example.com",
      provider: "naver",
    };

    it("네이버 프로필 검증 성공", async () => {
      const done = jest.fn();

      await naverStrategy.validate(
        "accessToken",
        "refreshToken",
        mockProfile as NaverProfile,
        done,
      );

      expect(done).toHaveBeenCalledWith(null, {
        email: "johndoe@example.com",
        provider: SocialProviders.NAVER,
        socialId: "123456",
        name: "John Doe",
      });
    });

    it("네이버 프로필 검증 실패", async () => {
      const done = jest.fn();
      const error = new Error("Validation failed");

      jest
        .spyOn(naverStrategy, "validate")
        .mockImplementation(async (accessToken, refreshToken, profile, done) => {
          done(error, null);
        });

      await naverStrategy.validate(
        "accessToken",
        "refreshToken",
        mockProfile as NaverProfile,
        done,
      );

      expect(done).toHaveBeenCalledWith(error, null);
    });
  });

  describe("KakaoPassportStrategy", () => {
    const mockProfile = {
      id: "123456",
      username: "John Doe",
      _json: {
        kakao_account: {
          email: "johndoe@example.com",
        },
      },
      provider: "kakao",
    };

    it("카카오 프로필 검증 성공", async () => {
      const done = jest.fn();

      await kakaoStrategy.validate(
        "accessToken",
        "refreshToken",
        mockProfile as KakaoProfile,
        done,
      );

      expect(done).toHaveBeenCalledWith(null, {
        email: "johndoe@example.com",
        provider: SocialProviders.KAKAO,
        socialId: "123456",
        name: "John Doe",
      });
    });

    it("카카오 프로필 검증 실패", async () => {
      const done = jest.fn();
      const error = new Error("Validation failed");

      jest
        .spyOn(kakaoStrategy, "validate")
        .mockImplementation(async (accessToken, refreshToken, profile, done) => {
          done(error, null);
        });

      await kakaoStrategy.validate(
        "accessToken",
        "refreshToken",
        mockProfile as KakaoProfile,
        done,
      );

      expect(done).toHaveBeenCalledWith(error, null);
    });
  });
});
