// 账号系统（注册 / 登录 / 找回）双语文案。zh = 繁體中文，en = 英文。纯资料模块。2026-07-20。

export const AUTH_T = {
  zh: {
    // ── 通用 ──
    studentIdLabel: '學號',
    studentIdPlaceholder: '9 位學號',
    passwordLabel: '密碼',
    passwordPlaceholder: '至少 6 位',
    show: '顯示',
    hide: '隱藏',
    processing: '處理中…',

    // ── 註冊 ──
    registerTitle: '註冊帳號',
    registerSubtitle: '用學號建立你的帳號，密碼自己設定。',
    confirmPasswordLabel: '確認密碼',
    confirmPasswordPlaceholder: '再輸入一次密碼',
    recoveryEmailLabel: '找回密碼用的信箱',
    recoveryEmailPlaceholder: 'you@example.com',
    recoveryEmailHint: '忘記密碼時，重設連結會寄到這個信箱。請填你常用、真實的信箱。',
    registerBtn: '註冊',
    haveAccount: '已經有帳號？',
    goLogin: '去登入',
    registerSuccess: '註冊成功，正在為你登入…',

    // ── 登入 ──
    loginTitle: '登入',
    loginSubtitle: '用學號和密碼登入。',
    loginBtn: '登入',
    noAccount: '還沒有帳號？',
    goRegister: '去註冊',
    forgotPassword: '忘記密碼？',

    // ── 前端即时校验 ──
    vIdLen: '學號需為 9 位。',
    vPwdLen: '密碼至少 6 位。',
    vPwdMismatch: '兩次輸入的密碼不一致。',
    vEmail: '請輸入有效的信箱。',

    // ── 账号入口徽标（各页右上角）──
    login: '登入',
    menuSettings: '設置',
    menuLogout: '退出登入',

    // ── 账号页 ──
    accountTitle: '我的帳號',
    chooseAvatarTitle: '選擇頭像',
    avatarSaved: '頭像已更新',
    identityLabel: '學號',
    identityReadonlyHint: '學號是你的帳號，不可更改。',
    recoveryEmailSectionTitle: '找回密碼信箱',
    saveEmail: '儲存信箱',
    emailSaved: '已更新',
    emailUnverified: '未驗證',
    changePasswordTitle: '修改密碼',
    newPassword: '新密碼',
    confirmNewPassword: '確認新密碼',
    updatePassword: '更新密碼',
    passwordUpdated: '密碼已更新',
    myPersonalityTitle: '我的人格',
    viewReport: '查看完整報告',
    notAssessedYet: '你還沒做過測評。',
    goAssess: '去測評',
    logout: '登出',
    backHome: '← 返回首頁',
    loadingAccount: '載入中…',

    // ── 错误码 → 提示 ──
    err: {
      invalid_student_id: '學號格式不對（需 9 位）。',
      weak_password: '密碼太短（至少 6 位）。',
      invalid_email: '信箱格式不對。',
      student_id_taken: '這個學號已經註冊過了，請直接登入或找回密碼。',
      account_exists: '這個學號已經註冊過了，請直接登入或找回密碼。',
      invalid_credentials: '學號或密碼不對。',
      request_failed: '請求失敗，請檢查網路後重試。',
      unknown: '出了點問題，請稍後重試。',
    } as Record<string, string>,
  },

  en: {
    // ── shared ──
    studentIdLabel: 'Student ID',
    studentIdPlaceholder: '9-character ID',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 6 characters',
    show: 'Show',
    hide: 'Hide',
    processing: 'Processing…',

    // ── register ──
    registerTitle: 'Create Account',
    registerSubtitle: 'Create your account with your student ID and a password you set.',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    recoveryEmailLabel: 'Recovery Email',
    recoveryEmailPlaceholder: 'you@example.com',
    recoveryEmailHint: 'If you forget your password, the reset link is sent here. Use a real email you check.',
    registerBtn: 'Register',
    haveAccount: 'Already have an account?',
    goLogin: 'Log in',
    registerSuccess: 'Registered! Signing you in…',

    // ── login ──
    loginTitle: 'Log In',
    loginSubtitle: 'Log in with your student ID and password.',
    loginBtn: 'Log In',
    noAccount: 'No account yet?',
    goRegister: 'Register',
    forgotPassword: 'Forgot password?',

    // ── client-side validation ──
    vIdLen: 'Student ID must be 9 characters.',
    vPwdLen: 'Password must be at least 6 characters.',
    vPwdMismatch: 'The two passwords do not match.',
    vEmail: 'Please enter a valid email.',

    // ── account chip (top-right on every page) ──
    login: 'Log In',
    menuSettings: 'Settings',
    menuLogout: 'Log Out',

    // ── account page ──
    accountTitle: 'My Account',
    chooseAvatarTitle: 'Choose Avatar',
    avatarSaved: 'Avatar updated',
    identityLabel: 'Student ID',
    identityReadonlyHint: 'Your student ID is your account and cannot be changed.',
    recoveryEmailSectionTitle: 'Recovery Email',
    saveEmail: 'Save Email',
    emailSaved: 'Updated',
    emailUnverified: 'Unverified',
    changePasswordTitle: 'Change Password',
    newPassword: 'New password',
    confirmNewPassword: 'Confirm new password',
    updatePassword: 'Update Password',
    passwordUpdated: 'Password updated',
    myPersonalityTitle: 'My Personality',
    viewReport: 'View full report',
    notAssessedYet: "You haven't taken the assessment yet.",
    goAssess: 'Take it',
    logout: 'Log Out',
    backHome: '← Back to Home',
    loadingAccount: 'Loading…',

    // ── error code → message ──
    err: {
      invalid_student_id: 'Invalid student ID (must be 9 characters).',
      weak_password: 'Password too short (at least 6 characters).',
      invalid_email: 'Invalid email format.',
      student_id_taken: 'This student ID is already registered. Please log in or reset your password.',
      account_exists: 'This student ID is already registered. Please log in or reset your password.',
      invalid_credentials: 'Wrong student ID or password.',
      request_failed: 'Request failed. Check your connection and try again.',
      unknown: 'Something went wrong. Please try again later.',
    } as Record<string, string>,
  },
} as const;
