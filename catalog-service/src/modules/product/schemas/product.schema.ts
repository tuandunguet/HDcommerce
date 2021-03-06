import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { Category } from 'src/modules/category/schemas/category.schema';
import { IProduct } from '../interfaces/product.interface';

@Schema({
  versionKey: false,
  timestamps: true,
})
export class Product extends Document implements IProduct {
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
  })
  title: string;

  @Prop({
    type: Boolean,
    required: true,
    default: true,
  })
  isEnabled: boolean;

  @Prop({
    type: Boolean,
    required: true,
    default: true,
  })
  isPublic: boolean;

  @Prop({
    type: Number,
    required: true,
    index: true,
  })
  price: number;

  @Prop({
    type: Number,
    required: true,
  })
  originalPrice: number;

  @Prop({
    type: Number,
    required: true,
  })
  stockQuantity: number;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  soldQuantity: number;

  @Prop({
    type: String,
    required: true,
  })
  description: string;

  @Prop({
    type: String,
    required: true,
  })
  shortDescription: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  slug: string;

  @Prop({
    type: String,
  })
  thumbnail: string;

  @Prop({
    type: [Object],
    required: true,
    default: [],
  })
  images: Record<string, any>[];

  @Prop({
    type: String,
    required: true,
  })
  metaTitle: string;

  @Prop({
    type: String,
    required: false,
  })
  metaDescription: string;

  @Prop({
    type: String,
  })
  metaKeywords: string;

  @Prop({
    type: [String],
    index: true,
  })
  tags: string[];

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Category.name,
    index: true,
  })
  categoryId: string;
}

const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({
  name: 'text',
  title: 'text',
  shortDescription: 'text',
  tags: 'text',
  metaKeywords: 'text',
});

export { ProductSchema };
