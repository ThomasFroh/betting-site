const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Prediction = sequelize.define('prediction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    creatorId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    optionA: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    optionB: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('open', 'locked', 'resolved', 'voided'),
        defaultValue: 'open',
        allowNull: false,
    },
    winningOption: {
        type: DataTypes.ENUM('A', 'B'),
        allowNull: true,
    },
    lockedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'prediction',
    timestamps: true,
});

module.exports = Prediction;
