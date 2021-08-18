export type Keyed<DataType = any, IndexType = string> = IndexType extends string ? StringKeyedShape<DataType> : NumberKeyedShape<DataType>

export type StringKeyedShape<DataType>  = {
  [index: string]: DataType
}

export interface NumberKeyedShape<DataType> {
  [index: string]: DataType
}

export function TAssert<T>(x: unknown): asserts x is T {
  return; // ¯\_(ツ)_/¯
}
