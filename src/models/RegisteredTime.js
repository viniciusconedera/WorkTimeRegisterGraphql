const { Model, DataTypes } = require('sequelize')
const Sequelize = require('../database')
const RegisteredTime = require('./RegisteredTime')

class RegisteredTime extends Model {
    static associate() {
        User.hasMany(RegisteredTime)
        RegisteredTime.belongsTo(User)
    }
}

RegisteredTime.init({
    time_registered: DataTypes.DATETIME,
}, { sequelize: Sequelize, modelName: 'registeredtime' })

RegisteredTime.associate()

module.exports = RegisteredTime