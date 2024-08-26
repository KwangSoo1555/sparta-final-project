import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy, AuthGuard } from "@nestjs/passport";
import { JwtPayload } from "jsonwebtoken";

import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";

import { UsersEntity } from "src/entities/users.entity";

import { MESSAGES } from "src/common/constants/message.constant";
import { Socket } from "socket.io";

const ExtractJwtFromSocket = {
  fromSocket: (socket: Socket) => {
    console.log(socket.handshake.auth);
    const authHeader = socket.handshake.auth.token;
    console.log("authHeader:" + authHeader);
    const token =
      authHeader && authHeader.toLowerCase().startsWith("bearer ") ? authHeader.substring(7) : null;
    console.log("Extracted Token:", token);
    return token;
  },
};

// Access token validation
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, "accessToken") {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>("ACCESS_TOKEN_SECRET"),
    });
  }
  async validate(payload: JwtPayload): Promise<UsersEntity> {
    const user = await this.authService.checkUserForAuth(payload.userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

// Refresh token validation
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, "refreshToken") {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>("REFRESH_TOKEN_SECRET"),
    });
  }
  async validate(payload: JwtPayload): Promise<UsersEntity> {
    const user = await this.authService.checkUserForAuth(payload.userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

@Injectable()
export class AccessTokenWsStrategy extends PassportStrategy(Strategy, "accessTokenWs") {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwtFromSocket.fromSocket, // 수정된 부분
      secretOrKey: configService.get<string>("ACCESS_TOKEN_SECRET"),
    });
  }
  async validate(payload: JwtPayload): Promise<UsersEntity> {
    const user = await this.authService.checkUserForAuth(payload.userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
// 인증 가드를 설정하여 보호된 라우트에 접근할 때 access token 과 refresh token 을 검증
@Injectable()
export class JwtAccessGuards extends AuthGuard("accessToken") {}
@Injectable()
export class JwtRefreshGuards extends AuthGuard("refreshToken") {}
@Injectable()
export class JwtSocketGuards extends AuthGuard("accessTokenWs") {}
