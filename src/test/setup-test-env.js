import Bootstrap from '../utils/bootstrap'

// Don't use process.env variables or dotenv for tests.
// Instead, directly inject configuration into registerServices().

new Bootstrap(`${__dirname}/panacea.js`).all()
