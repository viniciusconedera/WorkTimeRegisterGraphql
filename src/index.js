const { ApolloServer, gql, PubSub } = require('apollo-server');
const Sequelize = require('sequelize');

const typeDefs = gql`
  enum RoleEnum {
    USER
    ADMIN
  }

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
    user: User!
    time_registered: String!
  }

  type Query {
    allUsers: [User]
    user(id: ID!): User
    allRegisterTime: [RegisterTime]
  }

  type Mutation {
    createUser(data: CreateUserInput): User
    updateUser(id: ID! data: UpdateUserInput): User
    createRegisterTime(data: CreateRegisterTimeInput): RegisterTime
    updateRegisterTime(id: ID! data: UpdateRegisterTimeInput): RegisterTime
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
    user: CreateUserInput!
    time_registered: String!
  }

  input UpdateRegisterTimeInput {
    time_registered: String
  }
`
const users = [
  {id: 1, name: 'Dogma', email: 'dogma@hotmail.com', role: 'ADMIN'},
  {id: 2, name: 'Vinicius', email: 'vinicius@hotmail.com', role: 'USER'}
]

const resolver = {
  Query: {
    allUsers: () => users,
    user(_, { id }) {
      return users[id - 1];
    }
  },
  Mutation: {
    createUser(parent, body, context, info) {
      users.push(body.data);
      return users[users.length - 1];
    }
  }
}

const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: resolver
})


server.listen()
  .then(() => {
    console.log('Servidor rodando')
  });