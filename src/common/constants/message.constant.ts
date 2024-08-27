export const MESSAGES = {
  AUTH: {
    COMMON: {
      CURRENT_PASSWORD: {
        REQURIED: "현재 비밀번호를 입력해 주세요.",
        NOT_MACHTED_WITH_PASSWORD: "현재 비밀번호와 기존 비밀번호가 일치하지 않습니다.",
      },
      NEW_PASSWORD: {
        REQURIED: "새로운 비밀번호를 입력해 주세요.",
        NEW_PASSWORD_EQUAL_CURRENT_PASSWORD: "현재 비밀번호와 새로운 비밀번호는 같을 수 없습니다.",
      },
      UNAUTHORIZED: "인증 정보가 유효하지 않습니다.",
      JWT: {
        NO_TOKEN: "인증 정보가 없습니다.",
        NOT_SUPPORTED_TYPE: "지원하지 않는 인증 방식입니다.",
        EXPIRED: "인증 정보가 만료되었습니다.",
        NO_USER: "인증 정보와 일치하는 사용자가 없습니다.",
        INVALID: "인증 정보가 유효하지 않습니다.",
      },
    },
    SIGN_UP: {
      EMAIL: {
        DUPLICATED: "이메일이 이미 존재합니다.",
        FAIL: "메일 전송에 실패했습니다.",
        SUCCEED: "메일 전송에 성공했습니다.",
        VERIFICATION_CODE: {
          INCONSISTENT: "발송된 인증 코드와 다릅니다.",
          EXPIRED: "메일 인증이 만료되었습니다.",
          SUCCEED: "메일 인증이 완료되었습니다.",
        },
      },
      SUCCEED: "회원가입에 성공했습니다.",
    },
    SIGN_IN: {
      EMAIL: {
        NOT_FOUND: "이메일이 존재하지 않습니다.",
      },
      PASSWORD: {
        INCONSISTENT: "비밀번호가 일치하지 않습니다.",
      },
      SUCCEED: "로그인에 성공했습니다.",
    },
    SIGN_OUT: {
      SUCCEED: "로그 아웃에 성공했습니다.",
    },
    REISSUE_TOKEN: {
      SUCCEED: "토큰 재발급에 성공했습니다.",
    },
    TOKEN: {
      INVALID: "토큰이 유효하지 않습니다.",
      EXPIRED: "토큰이 만료되었습니다.",
      NOT_FOUND: "토큰이 존재하지 않습니다.",
      OCCURRED_ERROR: "토큰 생성 중 오류가 발생했습니다.",
    },
  },
  USERS: {
    READ_ME: {
      SUCCEED: "내 정보 조회에 성공했습니다.",
    },
    UPDATE_ME: {
      EMAIL: {
        DUPLICATED: "이메일이 이미 존재합니다.",
      },
      PASSWORD: {
        CURRENT_PASSWORD_REQUIRED: "현재 비밀번호를 입력해 주세요.",
        CURRENT_PASSWORD_INCONSISTENT: "현재 비밀번호가 일치하지 않습니다.",
        NEW_PASSWORD_NOT_EQUAL_CURRENT_PASSWORD:
          "현재 비밀번호와 새로운 비밀번호는 같을 수 없습니다.",
      },
      SUCCEED: "내 정보 수정에 성공했습니다.",
    },
    COMMON: {
      NOT_FOUND: "유저가 존재하지 않습니다.",
    },
  },
  JOBS: {
    CREATE: {
      CREATE_SUCCEED: "성공적으로 생성되었습니다.",
      DUPLICATE: "이미 존재하는 JOB일 입니다.",
    },
    READ: {
      READ_SUCCEED: "성공적으로 조회되었습니다.",
      NOT_VERIFY: "조회 권한이 없습니다.",
    },
    UPDATE: {
      UPDATE_SUCCEED: "성공적으로 수정되었습니다.",
      NOT_VERIFY: "수정 권한이 없습니다.",
    },
    DELETE: {
      DELETE_SUCCEED: "성공적으로 삭제되었습니다.",
      NOT_VERIFY: "삭제 권한이 없습니다.",
    },
    MATCHING: {
      MATCHING_SUCCEED: "성공적으로 매칭되었습니다.",
      NOT_VERIFY: "매칭 권한이 없습니다.",
      ALREADY_MATCHED: "이미 매칭된 JOB입니다.",
    },
    CANCEL: {
      CANCEL_SUCCEED: "성공적으로 취소되었습니다.",
      NOT_VERIFY: "취소 권한이 없습니다.",
    },
    LOCALCODES: {
      NOT_FOUND: "지역 코드를 찾을 수 없습니다.",
      NOT_FOUND_ADDRESS: "주소를 찾을 수 없습니다.",
    },
    NOT_EXISTS: "존재하지 않는 내용입니다.",
  },
  JOBMATCH: {
    CREATE: {
      DUPLICATED: "이미 매칭된 내용입니다.",
      CREATE_SUCCEED: "성공적으로 신청되었습니다.",
    },
    READ: {
      READ_SUCCEED: "성공적으로 조회되었습니다.",
      NOT_VERIFY: "조회 권한이 없습니다.",
    },
    DELETE: {
      DELETE_SUCCEED: "성공적으로 삭제되었습니다.",
      NOT_VERIFY: "삭제 권한이 없습니다.",
    },
    MATCHING: {
      MATCHING_SUCCEED: "성공적으로 매칭되었습니다.",
      NOT_VERIFY: "매칭 권한이 없습니다.",
    },
    REJECT: {
      REJECT_SUCCEED: "성공적으로 거정되었습니다.",
      NOT_VERIFY: "거절 권한이 없습니다.",
    },
    NOT_EXISTS: "존재하지 않는 내용입니다.",
  },
  BLACKLIST: {
    CREATE: {
      CREATE_SUCCEED: "성공적으로 등록되었습니다.",
    },
    READ: {
      READ_SUCCEED: "성공적으로 조회되었습니다.",
      NOT_VERIFY: "조회 권한이 없습니다.",
    },
    DELETE: {
      DELETE_SUCCEED: "성공적으로 삭제되었습니다.",
      NOT_VERIFY: "삭제 권한이 없습니다.",
    },
    NOT_EXISTS: "존재하지 않는 내용입니다.",
  },
  REPORTS: {
    ADMIN: {
      LIST_SUCCEED: "유저 신고 목록 조회에 성공하였습니다.",
    },
    CREATE: {
      SUCCEED: "신고가 성공적으로 접수되었습니다.",
    },
    READ: {
      LIST_SUCCEED: "신고 목록이 성공적으로 조회되었습니다.",
      DETAIL_SUCCEED: "신고 상세 정보가 성공적으로 조회되었습니다.",
    },
    UPDATE: {
      SUCCEED: "신고가 성공적으로 수정되었습니다.",
    },
    DELETE: {
      SUCCEED: "신고가 정상적으로 삭제되었습니다.",
    },
    ERRORS: {
      USER_NOT_FOUND: {
        REPORTED: "신고 대상 사용자를 찾을 수 없습니다.",
        REPORTER: "신고자 정보를 찾을 수 없습니다.",
      },
      DUPLICATE_REPORT: "이미 해당 사용자에 대한 신고가 존재합니다.",
      REPORT_NOT_FOUND: "해당 신고를 찾을 수 없거나 접근 권한이 없습니다.",
      INVALID_REPORT_ID: "유효한 reportId를 제공해주세요.",
    },
  },
  NOTICES: {
    CREATE: {
      SUCCESS: "공지사항이 성공적으로 생성되었습니다.",
    },
    READ: {
      LIST_SUCCESS: "공지사항 목록이 성공적으로 조회되었습니다.",
      DETAIL_SUCCESS: "공지사항이 성공적으로 조회되었습니다.",
    },
    UPDATE: {
      SUCCESS: "공지사항이 정상적으로 업데이트되었습니다.",
    },
    DELETE: {
      SUCCESS: "공지사항이 정상적으로 삭제되었습니다.",
    },
    ERROR: {
      INVALID_ID: "유효한 noticeId를 제공해주세요.",
      NOT_FOUND: "공지사항을 찾을 수 없습니다.",
    },
  },
};
