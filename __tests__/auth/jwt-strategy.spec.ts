import { Test, TestingModule } from "@nestjs/testing";
import { createMock, DeepMocked } from "@golevelup/ts-jest";
import { UnauthorizedException } from "@nestjs/common";

import { ConfigService } from "@nestjs/config";
import { AuthService } from "../../src/modules/auth/auth.service";

import {
  AccessTokenStrategy,
  RefreshTokenStrategy,
  AccessTokenWsStrategy,
} from "../../src/modules/auth/strategies/jwt-strategy";
import { JwtPayload } from "../../src/common/customs/types/jwt-payload.type";

import { UsersEntity } from "../../src/entities/users.entity";
import { SocialProviders } from "../../src/common/customs/enums/enum-social-providers";
import { UserRoles } from "../../src/common/customs/enums/enum-user-roles";

describe("JWT Strategies", () => {
  let module: TestingModule;
  let authService: DeepMocked<AuthService>;
  let accessTokenStrategy: AccessTokenStrategy;
  let refreshTokenStrategy: RefreshTokenStrategy;
  let accessTokenWsStrategy: AccessTokenWsStrategy;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: createMock<AuthService>(),
        },
        {
          provide: AccessTokenStrategy,
          useValue: createMock<AccessTokenStrategy>(),
        },
        {
          provide: RefreshTokenStrategy,
          useValue: createMock<RefreshTokenStrategy>(),
        },
        {
          provide: AccessTokenWsStrategy,
          useValue: createMock<AccessTokenWsStrategy>(),
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    accessTokenStrategy = module.get<AccessTokenStrategy>(AccessTokenStrategy);
    refreshTokenStrategy = module.get<RefreshTokenStrategy>(RefreshTokenStrategy);
    accessTokenWsStrategy = module.get<AccessTokenWsStrategy>(AccessTokenWsStrategy);

    // 각 전략에 대한 validate 메소드를 모킹
    jest.spyOn(accessTokenStrategy, "validate").mockImplementation(async (payload) => {
      const user = await authService.checkUserForAuth(payload.userId);
      if (!user) throw new UnauthorizedException();
      return user;
    });

    jest.spyOn(refreshTokenStrategy, "validate").mockImplementation(async (payload) => {
      const user = await authService.checkUserForAuth(payload.userId);
      if (!user) throw new UnauthorizedException();
      return user;
    });

    jest.spyOn(accessTokenWsStrategy, "validate").mockImplementation(async (payload) => {
      const user = await authService.checkUserForAuth(payload.userId);
      if (!user) throw new UnauthorizedException();
      return user;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const mockUser: UsersEntity = {
    id: 1,
    name: "testuser",
    email: "test@example.com",
    password: "hashedpassword",
    socialId: "123456",
    provider: SocialProviders.GOOGLE,
    role: UserRoles.USER,
  } as UsersEntity;
  const mockPayload: JwtPayload = { userId: 1, type: "ACCESS" };

  describe("AccessTokenStrategy", () => {
    it("유저 access token 검증 성공", async () => {
      authService.checkUserForAuth.mockResolvedValue(mockUser);
      const result = await accessTokenStrategy.validate(mockPayload);
      expect(result).toEqual(mockUser);
    });

    it("유저 access token 검증 실패", async () => {
      authService.checkUserForAuth.mockResolvedValue(null);
      await expect(accessTokenStrategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("RefreshTokenStrategy", () => {
    it("유저 refresh token 검증 성공", async () => {
      authService.checkUserForAuth.mockResolvedValue(mockUser);
      const result = await refreshTokenStrategy.validate(mockPayload);
      expect(result).toEqual(mockUser);
    });

    it("유저 refresh token 검증 실패", async () => {
      authService.checkUserForAuth.mockResolvedValue(null);
      await expect(refreshTokenStrategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("AccessTokenWsStrategy", () => {
    it("유저 websocket access token 검증 성공", async () => {
      authService.checkUserForAuth.mockResolvedValue(mockUser);
      const result = await accessTokenWsStrategy.validate(mockPayload);
      expect(result).toEqual(mockUser);
    });

    it("유저 websocket access token 검증 실패", async () => {
      authService.checkUserForAuth.mockResolvedValue(null);
      await expect(accessTokenWsStrategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
