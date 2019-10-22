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
    registeredTime: [RegisteredTime]
  }

  type RegisteredTime {
    id: ID!
    user: User!
    time_registered: String!
  }

  type Query {
    allUsers: [User]
    allRegistereTime: [RegisteredTime]
  }
`
const server = new ApolloServer({
  typeDefs: typeDefs,
})

server.listen()
  .then(() => {
    console.log('Servidor rodando')
  });