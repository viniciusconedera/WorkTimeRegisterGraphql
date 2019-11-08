const { ApolloServer, gql, PubSub } = require('apollo-server');
const Sequelize = require('./database');
const User = require('./models/User')
const RegisterTime = require('./models/RegisterTime')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const AuthDirective = require('./directives/auth')

const pubSub = new PubSub()

const typeDefs = gql`
  enum RoleEnum {
    USER
    ADMIN
  }

  directive @auth(
        role: RoleEnum
  ) on OBJECT | FIELD_DEFINITION

  type User {
    id: ID!
    name: String!
    email: String!
    password: String!
    role: RoleEnum
    RegisterTime: [RegisterTime]
  }

  type RegisterTime {
    id: ID!
    time_registered: String!
    user: User!
  }

  type Query {
    allUsers: [User]
    user(id: ID!): User
    allRegisterTime: [RegisterTime]
  }

  type Mutation {
    createUser(data: CreateUserInput): User @auth(role: ADMIN)
    updateUser(id: ID! data: UpdateUserInput): User
    deleteUser(id: ID!): Boolean
    createRegisterTime(data: CreateRegisterTimeInput): RegisterTime
    updateRegisterTime(id: ID! data: UpdateRegisterTimeInput): RegisterTime
    signin(
      email: String!
      password: String!
    ): PayloadAuth
  }

  type PayloadAuth {
        token: String!
        user: User!
  }

  type Subscription {
        onCreatedRegister: RegisterTime
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    role: RoleEnum!
  }

  input UpdateUserInput {
    name: String!
    email: String!
    password: String!
    role: RoleEnum!
  }

  input CreateRegisterTimeInput {
    time_registered: String!
    user: CreateUserInput
  }

  input UpdateRegisterTimeInput {
    time_registered: String
  }
`

const resolver = {
  Query: {
    allUsers() {
      return User.findAll({include: [RegisterTime]})
    },
    user(_, { id }) {
      return User.findByPk(id, {include: [RegisterTime]});
    }
  },
  Mutation: {
    async createRegisterTime(parent, body, context, info) {
      console.log(body)
      if (body.data.user) {
        const user = await User.findOne({
        where: { id: body.id }
        })
        body.data.user = user
        console.log(body.data.user)
        const registerTime = await RegisterTime.create(body.data)
        await registerTime.setUser(createdUser.get('id'))
        const reloadedRegister = RegisterTime.reload({ include: [User] })
        pubSub.publish('createdRegister', {
          onCreatedegister: reloadedRegister
        })
        return reloadedRegister
      } else {
        throw new Error('Funcionário não existe')
      }
    },
    async createUser(parent, body, context, info) {
      body.data.password = await bcrypt.hash(body.data.password, 10)
            const user = await User.create(body.data)
            return user
    },
    async deleteUser(parent, body, context, info) {
      const user = await User.findOne({
          where: { id: body.id }
      })
      await user.destroy()
      return true
    },
    async signin(parent, body, context, info) {
      const user = await User.findOne({
          where: { email: body.email }
      })

      if (user) {
          const isCorrect = await bcrypt.compare(
              body.password,
              user.password
          )
          if (!isCorrect) {
              throw new Error('Senha inválida')
          }

          const token = jwt.sign({ id: user.id }, 'secret')

          return {
              token,
              user
          }
      }
    }
  },
  Subscription: {
    onCreatedRegister: {
        subscribe: () => pubSub.asyncIterator('createdRegister')
    }
  }
}

const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: resolver,
  schemaDirectives: {
    auth: AuthDirective
  },
  context({ req }) {
    return {
        headers: req.headers
    }
  }
})

Sequelize.sync().then(() => {
  server.listen()
    .then(() => {
      console.log('Servidor rodando')
    });
})
