// Configuration for different environments
const config = {
  development: {
    backendUrl: 'http://localhost:8000'
  },
  production: {
    backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://54.165.206.10'
  }
};

const environment = process.env.NODE_ENV || 'development';
export const BACKEND_URL = config[environment as keyof typeof config].backendUrl; 