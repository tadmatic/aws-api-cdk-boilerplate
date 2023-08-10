import * as yup from 'yup';

export interface Item {
  itemId: string;
  name: string;
  count: number;
}

// Validation - POST - New Item Request
export const PostItemSchema = yup
  .object()
  .shape({
    itemId: yup.string().optional(),
    name: yup.string().required('name is required'),
    count: yup
      .number()
      .required('count is required')
      .typeError('count should be a number')
      .integer('count should be an integer'),
  })
  .strict(true);

// Validation - PUT - Upsert Item Request
export const PutItemSchema = yup
  .object()
  .shape({
    itemId: yup.string().required('itemId is required'),
    name: yup.string().required('name is required'),
    count: yup
      .number()
      .required('count is required')
      .typeError('count should be a number')
      .integer('count should be an integer'),
  })
  .strict(true);

// Validation - PATCH - Update Item Request (partial update)
export const PatchItemSchema = yup
  .object()
  .shape({
    itemId: yup.string().required('itemId is required'),
    name: yup.string().optional(),
    count: yup
      .number()
      .typeError('count should be a number')
      .integer('count should be an integer')
      .optional(),
  })
  .strict(true);
