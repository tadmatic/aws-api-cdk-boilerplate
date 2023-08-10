import { ITEM_TABLE, REGION } from '../constants';
import { DynamoDb, IDatabase } from '../dynamodb';
import { Item } from '../types/Item';

export class ItemRepo {
  private static instance: ItemRepo;
  private readonly db: IDatabase;

  constructor(tableName = ITEM_TABLE, region = REGION) {
    this.db = new DynamoDb(tableName, 'itemId', region);
  }

  public static getInstance(): ItemRepo {
    if (!ItemRepo.instance) {
      ItemRepo.instance = new ItemRepo();
    }

    return ItemRepo.instance;
  }

  async getItems(): Promise<Item[]> {
    return await this.db.getAllItems<Item>();
  }

  async getItemById(itemId: string): Promise<Item | null> {
    return await this.db.getItemByKey<Item>(itemId);
  }

  async upsertItem(item: Item): Promise<void> {
    await this.db.upsertItem(item);
  }

  async updateItem(item: Item): Promise<void> {
    await this.db.updateItem(item);
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.db.deleteItemByKey(itemId);
  }
}
