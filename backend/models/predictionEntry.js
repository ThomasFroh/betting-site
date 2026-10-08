const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const PredictionEntry = sequelize.define('predictionEntry', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    predictionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'prediction',
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    option: {
        type: DataTypes.ENUM('A', 'B'),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0.01
        }
    },
    payout: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('active', 'won', 'lost', 'refunded'),
        defaultValue: 'active',
        allowNull: false,
    },
}, {
    tableName: 'predictionEntry',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['predictionId', 'userId']
        }
    ]
});

module.exports = PredictionEntry;
