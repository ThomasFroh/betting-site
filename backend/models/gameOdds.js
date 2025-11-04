const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const GameOdds = sequelize.define('gameOdds', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    eventId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    sport: {
        type: DataTypes.STRING,
        allowNull: false,
        index: true,
    },
    commenceTime: {
        type: DataTypes.DATE,
        allowNull: false,
        index: true,
    },
    homeTeam: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    awayTeam: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    eventData: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Full event data from odds API including bookmakers, markets, etc.'
    },
    lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'gameOdds',
    timestamps: true,
    indexes: [
        {
            fields: ['sport', 'commenceTime']
        },
        {
            fields: ['commenceTime']
        }
    ]
});

module.exports = GameOdds;

