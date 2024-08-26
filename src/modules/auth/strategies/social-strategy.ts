import { Injectable, ConflictException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as NaverStrategy, Profile as NaverProfile } from "passport-naver-v2";
import { Strategy as KakaoStrategy, Profile as KakaoProfile } from "passport-kakao";
import { ConfigService } from "@nestjs/config";

import { AuthService } from "../auth.service";

import { UsersEntity } from "src/entities/users.entity";
import { SocialSignInDto } from "../dto/sign-in.dto";
import { SocialProviders } from "src/common/customs/enums/enum-social-providers";
import { MESSAGES } from "src/common/constants/message.constant";

@Injectable()
export class GooglePassportStrategy extends PassportStrategy(GoogleStrategy, "google") {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get("GOOGLE_CLIENT_ID"),
      clientSecret: configService.get("GOOGLE_CLIENT_SECRET"),
      callbackURL: configService.get("GOOGLE_CALLBACK_URL"),
      scope: ["email", "profile"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: (error: any, result: any) => void,
  ) {
    const { id, name, emails, provider } = profile;
    try {
      const googleSignInDto: SocialSignInDto = {
        email: emails[0].value,
        provider: provider as SocialProviders,
        socialId: id,
        name: name.familyName + name.givenName,
      };
      done(null, googleSignInDto);
    } catch (error) {
      done(error, null);
    }
  }
}

@Injectable()
export class NaverPassportStrategy extends PassportStrategy(NaverStrategy, "naver") {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get("NAVER_CLIENT_ID"),
      clientSecret: configService.get("NAVER_CLIENT_SECRET"),
      callbackURL: configService.get("NAVER_CALLBACK_URL"),
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: NaverProfile,
    done: (error: any, result: any) => void,
  ) {
    const { id, name, email, provider } = profile;
    try {
      const naverSignInDto: SocialSignInDto = {
        email: email,
        provider: provider.toUpperCase() as SocialProviders,
        socialId: id,
        name: name,
      };
      done(null, naverSignInDto);
    } catch (error) {
      done(error, null);
    }
  }
}

@Injectable()
export class KakaoPassportStrategy extends PassportStrategy(KakaoStrategy, "kakao") {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get("KAKAO_CLIENT_ID"),
      clientSecret: configService.get("KAKAO_CLIENT_SECRET"),
      callbackURL: configService.get("KAKAO_CALLBACK_URL"),
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: KakaoProfile,
    done: (error: any, result: any) => void,
  ) {
    const {
      id,
      username,
      _json: {
        kakao_account: { email },
      },
      provider,
    } = profile;
    try {
      const kakaoSignInDto: SocialSignInDto = {
        email: email,
        provider: provider.toUpperCase() as SocialProviders,
        socialId: id,
        name: username,
      };
      done(null, kakaoSignInDto);
    } catch (error) {
      done(error, null);
    }
  }
}
