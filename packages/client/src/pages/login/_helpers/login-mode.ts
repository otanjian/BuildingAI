export type LoginMode = "sms" | "password";

const MOBILE_REGEX = /^1[3-9]\d{9}$/;

export function isMainlandMobile(account: string): boolean {
  return MOBILE_REGEX.test(account.trim());
}

export function resolveInitialLoginMode(options: {
  allowPhoneLogin: boolean;
  allowAccountLogin: boolean;
}): LoginMode {
  if (options.allowPhoneLogin) {
    return "sms";
  }
  return "password";
}

export function resolveLoginModeForAccount(options: {
  account: string;
  allowPhoneLogin: boolean;
  allowAccountLogin: boolean;
  passwordPreferred: boolean;
}): LoginMode {
  const { account, allowPhoneLogin, allowAccountLogin, passwordPreferred } = options;
  const mobile = isMainlandMobile(account);

  if (mobile && allowPhoneLogin) {
    if (passwordPreferred && allowAccountLogin) {
      return "password";
    }
    return "sms";
  }

  if (allowAccountLogin) {
    return "password";
  }

  if (allowPhoneLogin) {
    return "sms";
  }

  return "password";
}
