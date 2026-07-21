import express from 'express';
import { getCitiesByCountry, getCountries, getPhoneCodeByCountry } from '../controllers/location.controller.js';
const locationRoutes= express.Router();



// GET /api/location/countries
locationRoutes.get('/countries', getCountries);

// GET /api/location/cities/PK (or any country ISO code)
locationRoutes.get('/cities/:countryIso', getCitiesByCountry);

// GET /api/location/phonecode/PK  → returns { name, iso2, phoneCode }
locationRoutes.get('/phonecode/:countryIso', getPhoneCodeByCountry);

export default locationRoutes;