const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Bet = sequelize.define('bet', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    eventId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    sport: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    homeTeam: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    awayTeam: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    betType: {
        type: DataTypes.ENUM('home_win', 'away_win'),
        allowNull: false,
    },
    betAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0.01
        }
    },
    odds: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    potentialPayout: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'won', 'lost', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
    },
    eventDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    settledAt: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    tableName: 'bet',
    timestamps: true,
});

module.exports = Bet;
