const { Model, DataTypes } = require('sequelize')
const Sequelize = require('../database')
const User = require('./User')

class RegisterTime extends Model {
  static associate() {
    User.hasMany(RegisterTime)
    RegisterTime.belongsTo(User)
  }
 }

RegisterTime.init({
    time_registered: DataTypes.DATETIME
}, { sequelize: Sequelize, modelName: 'time_registered' })

RegisterTime.associate()

module.exports = RegisterTime