import { AnyBulkWriteOperation, Db } from 'mongodb';

module.exports = {
  async up(db: Db) {
    const chats = db.collection('chats');
    const messages = db.collection('messages');

    // Process chats in batches using a cursor
    const cursor = chats.find(
      { messages: { $exists: true, $ne: [] } },
      { projection: { _id: 1, messages: 1 } },
    );

    const bulkOps: AnyBulkWriteOperation[] = [];

    for await (const chat of cursor) {
      for (const msg of chat.messages) {
        bulkOps.push({
          insertOne: {
            document: {
              _id: msg._id,
              chatId: chat._id,
              content: msg.content,
              userId: msg.userId,
              createdAt: msg.createdAt,
              updatedAt: msg.createdAt,
            },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await messages.bulkWrite(bulkOps);
    }

    // Create the compound index for message pagination
    await messages.createIndex({ chatId: 1, createdAt: -1, _id: -1 });

    // Remove embedded messages array from all chat documents
    await chats.updateMany({}, { $unset: { messages: '' } });
  },
};
