import { assertGuardianPortalAccess } from '../guardians/guardians.access';
import { Guardian } from '../../models/Guardian';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../../models/User';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { Role } from '../../types/roles';
import { RegisterInput, LoginInput } from './auth.validation';
import { logAudit } from '../audit/audit.service';
import { linkAccountByEmail } from '../staff/staff.repository';

interface AccessTokenPayload {
  sub: string;
  role: Role;
  tokenVersion: number;
}

const SALT_ROUNDS = 12;

function signAccessToken(user: IUser): string {
  const payload: AccessTokenPayload = {
    sub: user._id.toString(),
    role: user.role,
    tokenVersion: user.refreshTokenVersion,
  };
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

function signRefreshToken(user: IUser): string {
  const payload: AccessTokenPayload = {
    sub: user._id.toString(),
    role: user.role,
    tokenVersion: user.refreshTokenVersion,
  };
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

/** Revocation, deactivation and role changes apply to every protected request. */
export async function validateAccessSession(payload: AccessTokenPayload): Promise<void> {
  const user = await User.findById(payload.sub).select('role isActive refreshTokenVersion').lean();
  if (!user || !user.isActive || user.refreshTokenVersion !== payload.tokenVersion || user.role !== payload.role)
    throw ApiError.unauthorized('Session is no longer valid');
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

function issueTokenPair(user: IUser): { accessToken: string; refreshToken: string } {
  return { accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) };
}

export async function register(
  input: RegisterInput,
): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await User.create({ name: input.name, email: input.email, passwordHash, role: input.role });
  // A staff member may be added by HR before their portal account is created. Matching by the
  // already-unique email makes the existing Staff/Leave self-service UI work immediately after
  // registration, without an unsafe client-supplied staff id.
  await linkAccountByEmail(user._id.toString(), user.email);
  const tokens = issueTokenPair(user);
  return { user, ...tokens };
}

/** Deliberately returns the same generic error for "no such user" and "wrong password" -
 * distinguishing them lets an attacker enumerate valid emails (OWASP A07: Identification &
 * Authentication Failures). */
export async function login(input: LoginInput): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const valid = await user.comparePassword(input.password);
  if (!valid) {
    // A failed login attempt is exactly the kind of event a real audit trail exists for -
    // logged with Warning severity, distinct from the routine Info-level successful login below.
    await logAudit(`Failed login attempt for ${user.email}`, 'Auth', user._id.toString(), 'Warning');
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
  await assertGuardianPortalAccess(user._id.toString(), user.role);
  if (user.role === 'Parent') await Guardian.updateOne({ userId: user._id }, { $set: { lastLoginAt: new Date() } });
  const tokens = issueTokenPair(user);
  await logAudit(`${user.email} logged in`, 'Auth', user._id.toString(), 'Info');
  return { user, ...tokens };
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: AccessTokenPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid or expired refresh token');
  // Reject tokens issued before the last logout/password-change bumped the version.
  if (user.refreshTokenVersion !== payload.tokenVersion) throw ApiError.unauthorized('Session has been revoked');

  await assertGuardianPortalAccess(user._id.toString(), user.role);
  return issueTokenPair(user);
}

/** Bumping the token version invalidates every outstanding refresh token for this user
 * immediately - a real server-side logout, not just "the client forgot the token". */
export async function logout(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $inc: { refreshTokenVersion: 1 } });
  await logAudit('User logged out', 'Auth', userId, 'Info');
}

/** Backs the /me endpoint AND client-side session revalidation on app load. Fetches the current
 * DB state rather than trusting the JWT payload alone, so a deactivated account or a role change
 * made by an admin is reflected the next time the client checks - a valid, unexpired access token
 * for a since-deactivated user should NOT continue to work. */
export async function getCurrentUser(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw ApiError.unauthorized('Session is no longer valid');
  return user;
}
