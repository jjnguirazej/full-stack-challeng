const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION!...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then(() => console.log('Conexão de banco de dados feita com sucesso'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`API correndo na porta ${port}...`);
});

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION!...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});


