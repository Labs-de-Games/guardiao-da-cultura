export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message = "Invalid credentials") {
    super(message, 401);
    this.name = "InvalidCredentialsError";
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message = "Token has expired") {
    super(message, 401);
    this.name = "TokenExpiredError";
  }
}

export class AccountNotVerifiedError extends AuthError {
  constructor(message = "Account email is not verified") {
    super(message, 403);
    this.name = "AccountNotVerifiedError";
  }
}

export class EmailExistsError extends AuthError {
  constructor(message = "Email already exists") {
    super(message, 409);
    this.name = "EmailExistsError";
  }
}

export class TokenReuseDetectedError extends AuthError {
  constructor(message = "Token reuse detected. Please log in again.") {
    super(message, 401);
    this.name = "TokenReuseDetectedError";
  }
}
