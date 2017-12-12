import bootstrap from '../utils/bootstrap'

// Don't use process.env variables or dotenv for tests.
// Instead, directly inject configuration into registerServices().

new bootstrap(`${__dirname}/panacea.js`).all()

const { registry } = DI.container
