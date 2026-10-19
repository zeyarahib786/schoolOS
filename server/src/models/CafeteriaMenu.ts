import { Schema, model, Document } from 'mongoose';

export interface IMenuDish {
  item: string;
  calories: number;
  vegetarian: boolean;
  allergens: string[];
}

export interface ICafeteriaMenu extends Document {
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
  breakfast?: IMenuDish;
  lunch?: IMenuDish;
  snack?: IMenuDish;
  history: { at: Date; by: string; meal: string; reason: string; previous?: IMenuDish }[];
  createdAt: Date;
  updatedAt: Date;
}

const dishSchema = new Schema<IMenuDish>(
  {
    item: { type: String, required: true, trim: true, maxlength: 200 },
    calories: { type: Number, required: true, min: 0, max: 5000 },
    vegetarian: { type: Boolean, required: true },
    allergens: [{ type: String, trim: true, maxlength: 80 }],
  },
  { _id: false },
);

const cafeteriaMenuSchema = new Schema<ICafeteriaMenu>(
  {
    history: [
      {
        at: Date,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        meal: String,
        reason: String,
        previous: dishSchema,
      },
    ],
    day: { type: String, enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], required: true, unique: true },
    breakfast: dishSchema,
    lunch: dishSchema,
    snack: dishSchema,
  },
  { timestamps: true },
);

export const CafeteriaMenu = model<ICafeteriaMenu>('CafeteriaMenu', cafeteriaMenuSchema);
