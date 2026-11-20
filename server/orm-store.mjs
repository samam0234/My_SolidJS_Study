// DB_ACCESS=orm일 때 사용하는 실제 ORM/ODM 어댑터. SQLite 기본 실습은 node:sqlite이다.
export async function openOrmStore(driver, url) {
  if (driver === 'mongodb') {
    const { default: mongoose } = await import('mongoose');
    const connection = await mongoose.createConnection(url, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const schema = new mongoose.Schema({ bucket: { type: String, required: true }, id: { type: Number, required: true }, payload: { type: mongoose.Schema.Types.Mixed, required: true } }, { versionKey: false, collection: 'records' });
    schema.index({ bucket: 1, id: 1 }, { unique: true });
    const Record = connection.model('StudyRecord', schema); await Record.init();
    return {
      all: async bucket => (await Record.find({ bucket }).sort({ id: 1 }).lean()).map(r => r.payload),
      put: async (bucket, row) => { await Record.updateOne({ bucket, id: row.id }, { $set: { payload: row } }, { upsert: true, runValidators: true }); return row; },
      delete: async (bucket, id) => { await Record.deleteOne({ bucket, id }); },
      close: () => connection.close()
    };
  }
  if (!['postgres', 'mariadb'].includes(driver)) throw new Error('ORM은 postgres, mariadb, mongodb를 지원합니다.');
  const { Sequelize, DataTypes } = await import('sequelize');
  const db = new Sequelize(url, { dialect: driver, logging: false, pool: { max: 5, min: 0 }, define: { timestamps: false } });
  const Record = db.define('Record', {
    bucket: { type: DataTypes.STRING(100), primaryKey: true }, id: { type: DataTypes.BIGINT, primaryKey: true },
    payload: { type: driver === 'mariadb' ? DataTypes.TEXT('long') : DataTypes.TEXT, allowNull: false }
  }, { tableName: 'orm_records', freezeTableName: true });
  // sync는 새 학습 DB 생성에만 사용한다. 운영 스키마 변경은 마이그레이션으로 관리한다.
  await db.authenticate(); await Record.sync();
  return {
    all: async bucket => (await Record.findAll({ where: { bucket }, order: [['id', 'ASC']], raw: true })).map(r => JSON.parse(r.payload)),
    put: async (bucket, row) => { await Record.upsert({ bucket, id: row.id, payload: JSON.stringify(row) }); return row; },
    delete: async (bucket, id) => { await Record.destroy({ where: { bucket, id } }); },
    close: () => db.close()
  };
}
