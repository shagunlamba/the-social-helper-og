const AdminBro = require('admin-bro')
const AdminBroExpress = require('admin-bro-expressjs')
const AdminBroMongoose = require('admin-bro-mongoose')

const mongoose = require('mongoose');
// const mongoose = require("mongoose");


const User = require("../models/user");

// module.exports = db;
AdminBro.registerAdapter(AdminBroMongoose);


const adminBro = new AdminBro({
  databases: [],
  rootPath: '/admin',
  resources: [User]
});
// const router = AdminBroExpress.buildRouter(adminBro);

const ADMIN = {
  email: 'test@example.com',
  password: 'password',
}

const router= AdminBroExpress.buildAuthenticatedRouter(adminBro, {
  authenticate: async (email, password) => {
    if (ADMIN.password === password && ADMIN.email === email) {
      return ADMIN
    }
    return null
  },
  cookieName: 'adminbro',
  cookiePassword: 'somePassword',
});

module.exports = router;

