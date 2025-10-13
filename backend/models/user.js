const { DataTypes } = require('sequelize');
const sequelize = require('../database'); // Adjust the path as needed

const User = sequelize.define('user', { // Changed model name to 'user'
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'user', // Explicitly specify the table name
    timestamps: true, // Enable automatic createdAt and updatedAt fields
});

module.exports = User;
