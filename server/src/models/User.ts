import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role, ROLES } from '../types/roles';

export interface IUser extends Document {
  _id: Types.ObjectId;
  loginId?: string;
  mustChangePassword: boolean;
  temporaryPasswordExpiresAt?: Date;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  refreshTokenVersion: number; // bumped on logout/password change to invalidate old refresh tokens
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    loginId: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    mustChangePassword: { type: Boolean, default: false },
    temporaryPasswordExpiresAt: Date,
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    isActive: { type: Boolean, default: true },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Never serialize the password hash even if a query accidentally selects it.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as { passwordHash?: string }).passwordHash;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);
