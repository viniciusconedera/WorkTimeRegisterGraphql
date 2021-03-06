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
    registertimes: [RegisterTime]
    entrance: String
    exit: String
  }

  type RegisterTime {
    id: ID!
    time_registered: String!
    user: User
  }

  type Query {
    allUsers: [User] @auth(role:ADMIN)
    user(id: ID!): [RegisterTime]
    allRegisters: [RegisterTime] @auth(role:ADMIN)
    lastRegister(id: ID!): RegisterTime
  }

  

  type Mutation {
    createMaster(pass: String! data: CreateUserInput): User
    createUser(data: CreateUserInput): User @auth(role: ADMIN)
    updateUser(id: ID! data: UpdateUserInput): User
    deleteUser(id: ID!): Boolean
    createRegisterTime(id: ID! data: CreateRegisterTimeInput): RegisterTime @auth(role: USER)
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
    entrance: String
    exit: String
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
    allRegisters() {
      return RegisterTime.findAll({include: [User]})
    },
    user(_, { id }) {
      return User.findByPk(id, {include: [RegisterTime]});
    }
  },
  Mutation: {
    async createRegisterTime(parent, body, context, info) {
      if (body.id) {
        const user = await User.findOne({
        where: { id: body.id }
        })
        const registerTime = await RegisterTime.create(body.data)
        await registerTime.setUser(user.get('id'))
        const reloadedRegister = registerTime.reload({ include: [User] })
        pubSub.publish('createdRegister', {
          onCreatedRegister: reloadedRegister
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
    async createMaster(parent, body, context, info) {
      if (body.pass === "MasterUser") {
        body.data.password = await bcrypt.hash(body.data.password, 10)
        const user = await User.create(body.data)
        return user
      } else {
        throw new Error('Senha incorreta')
      }
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
  },
  User: {
    entrance(parent, body, context, info) {
      if (!parent.registertimes.length) {
        return ''
      }
      const registers = parent.registertimes.length
      if (registers === 1) {
        return parent.registertimes[0].time_registered
      } else {
        if (registers % 2) {
          return parent.registertimes[registers-1].time_registered
        } else {
          return parent.registertimes[registers-2].time_registered
        }
      }
    },
    exit(parent, body, context, info) {
      const registers = parent.registertimes.length
      if (registers <= 1) {
        return ''
      } else {
        if (registers % 2) {
          return parent.registertimes[registers-2].time_registered
        } else {
          return parent.registertimes[registers-1].time_registered
        }
      }
    }
  }
}

const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: resolver,
  schemaDirectives: {
    auth: AuthDirective
  },
  context({ req, connection }) {
    if (connection) {
      return connection.context
  }
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
