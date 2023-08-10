import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import * as AWSXray from 'aws-xray-sdk';

import { REGION } from './constants';

export interface IDatabase {
  getAllItems<T>(): Promise<T[]>;
  getItemByKey<T>(keyValue: string): Promise<T | null>;
  upsertItem(item: unknown): Promise<void>;
  updateItem(item: unknown): Promise<void>;
  deleteItem(keyValue: string): Promise<void>;
}

export class DynamoDb implements IDatabase {
  private static instance: DynamoDb;
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly keyName: string;

  constructor(tableName: string, keyName: string, region = REGION) {
    const client = AWSXray.captureAWSv3Client(new DynamoDBClient({ region }));
    this.client = DynamoDBDocumentClient.from(client);
    this.tableName = tableName;
    this.keyName = keyName;
  }

  async getAllItems<T>(): Promise<T[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
    });

    const response = await this.client.send(command);
    return (response.Items as T[]) || [];
  }

  async getItemByKey<T>(keyValue: unknown): Promise<T | null> {
    const key: Record<string, unknown> = {};
    key[this.keyName] = keyValue;

    const command = new GetCommand({
      TableName: this.tableName,
      Key: key,
    });

    const response = await this.client.send(command);
    return (response.Item as T) || null;
  }

  async upsertItem(item: unknown): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item as Record<string, unknown>,
    });

    await this.client.send(command);
  }

  async updateItem(item: unknown): Promise<void> {
    const itemRecord = item as Record<string, unknown>;

    const key: Record<string, unknown> = {};
    key[this.keyName] = itemRecord[this.keyName];

    // Automatically generate the UpdateExpression and ExpressionAttributeValues
    const updateExpressions: string[] = [];
    const expressionAttributeValues: { [key: string]: unknown } = {};
    const expressionAttributeNames: { [key: string]: string } = {};

    for (const [field, value] of Object.entries(itemRecord)) {
      // Avoid primary key in update expression
      if (field !== this.keyName) {
        const attributeKey = `:${field}`;
        const attributeName = `#${field}`;
        updateExpressions.push(`${attributeName} = ${attributeKey}`);
        expressionAttributeValues[attributeKey] = value;
        expressionAttributeNames[attributeName] = field;
      }
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: key,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
    });

    await this.client.send(command);
  }

  async deleteItem(keyValue: unknown): Promise<void> {
    const key: Record<string, unknown> = {};
    key[this.keyName] = keyValue;

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: key,
    });

    await this.client.send(command);
  }
}
